<?php
require_once __DIR__ . '/../Connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

try {
  $db = new Database();
  $conn = $db->getConnection();

  $method = $_SERVER['REQUEST_METHOD'];
  $input = json_decode(file_get_contents('php://input'), true);

  switch ($method) {
    case 'GET':
      if (isset($_GET['user_id'])) {
        getUserHistory($conn, (int)$_GET['user_id']);
      } else {
        listHistory($conn);
      }
      break;
    case 'POST':
      createHistory($conn, $input);
      break;
    default:
      Response::error('Method not allowed', 405);
  }
} catch (Throwable $e) {
  error_log('Borrowing History API error: ' . $e->getMessage());
  Response::error('Server error', 500);
}

function listHistory(PDO $conn) {
  $driver = $conn->getAttribute(PDO::ATTR_DRIVER_NAME);
  $equipmentNamesExpr = $driver === 'pgsql'
    ? "STRING_AGG(DISTINCT e.name, ', ')"
    : "GROUP_CONCAT(DISTINCT e.name ORDER BY e.name SEPARATOR ', ')";
  $categoriesExpr = $driver === 'pgsql'
    ? "STRING_AGG(DISTINCT e.category, ', ')"
    : "GROUP_CONCAT(DISTINCT e.category ORDER BY e.category SEPARATOR ', ')";

  // ดึงข้อมูลประวัติการยืม-คืนแบบใหม่ - แยกตามคำขอที่ต่างกัน
  $stmt = $conn->prepare("
    SELECT 
      b.user_id,
      u.fullname as user_fullname,
      u.student_id as user_student_id,
      b.borrow_date,
      b.due_date,
      b.return_date,
      b.status,
      b.notes,
      COUNT(b.id) as borrowing_count,
      COUNT(DISTINCT e.id) as equipment_count,
      {$equipmentNamesExpr} as equipment_names,
      {$categoriesExpr} as categories,
      COALESCE(approver.fullname, 'ระบบ') as approver_name,
      MIN(b.id) as borrowing_id
    FROM borrowing b
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN equipment e ON b.equipment_id = e.id
    LEFT JOIN borrowing_history bh ON b.id = bh.borrowing_id AND bh.action = 'borrow'
    LEFT JOIN users approver ON bh.approver_id = approver.id
    GROUP BY 
      b.user_id,
      u.fullname,
      u.student_id,
      b.borrow_date,
      b.due_date,
      b.return_date,
      b.status,
      b.notes,
      approver.fullname
    ORDER BY b.borrow_date DESC, b.user_id
  ");
  $stmt->execute();
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // ดึงรายละเอียดอุปกรณ์สำหรับแต่ละรายการ
  $finalRows = [];
  foreach ($rows as $row) {
    // ดึงรายละเอียดอุปกรณ์สำหรับรายการนี้
    $equipmentStmt = $conn->prepare("
      SELECT 
        e.name,
        COUNT(b.id) as quantity
      FROM borrowing b
      JOIN equipment e ON b.equipment_id = e.id
      WHERE b.user_id = ? 
        AND b.borrow_date = ?
        AND b.due_date = ?
        AND b.status = ?
        AND b.notes = ?
      GROUP BY e.id, e.name
      ORDER BY e.name
    ");
    $equipmentStmt->execute([
      $row['user_id'], 
      $row['borrow_date'], 
      $row['due_date'], 
      $row['status'], 
      $row['notes']
    ]);
    $equipmentDetails = $equipmentStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ดึงเวลาที่ส่งคำขอยืมจาก borrow_requests
    $requestTimeStmt = $conn->prepare("
      SELECT br.request_date
      FROM borrow_requests br
      JOIN borrow_request_items bri ON br.id = bri.request_id
      JOIN borrowing b ON bri.equipment_id = b.equipment_id
      WHERE b.user_id = ? 
        AND DATE(b.borrow_date) = DATE(?)
        AND DATE(b.due_date) = DATE(?)
        AND b.status = ?
        AND b.notes = ?
      ORDER BY br.request_date DESC
      LIMIT 1
    ");
    $requestTimeStmt->execute([
      $row['user_id'], 
      $row['borrow_date'], 
      $row['due_date'], 
      $row['status'], 
      $row['notes']
    ]);
    $requestTime = $requestTimeStmt->fetch(PDO::FETCH_ASSOC);
    
    // สร้างรายการอุปกรณ์
    $equipmentList = [];
    foreach ($equipmentDetails as $equipment) {
      $equipmentList[] = $equipment['name'] . ' (' . $equipment['quantity'] . ' ชิ้น)';
    }
    
    $row['equipment_details'] = $equipmentList;
    
    // ใช้เวลาที่ส่งคำขอแทนเวลา 00:00
    if ($requestTime && $requestTime['request_date']) {
      $row['request_time'] = $requestTime['request_date'];
    } else {
      $row['request_time'] = $row['borrow_date'];
    }
    
    $finalRows[] = $row;
  }
  
  Response::success('OK', ['history' => $finalRows]);
}

function getUserHistory(PDO $conn, int $userId) {
  // ดึงข้อมูลผู้ใช้
  $userStmt = $conn->prepare("
    SELECT id, fullname, student_id 
    FROM users 
    WHERE id = ?
  ");
  $userStmt->execute([$userId]);
  $user = $userStmt->fetch(PDO::FETCH_ASSOC);
  if (!$user) {
    Response::error('ไม่พบข้อมูลผู้ใช้', 404);
  }

  // ดึงรายการยืมทั้งหมด
  $stmt = $conn->prepare("
    SELECT 
      b.id as borrowing_id,
      b.borrow_date,
      b.due_date,
      b.return_date,
      b.status,
      b.notes,
      e.id as equipment_id,
      e.name as equipment_name,
      e.category,
      bh.action,
      bh.action_date,
      COALESCE(bh.approver_name, u.fullname) as approver_name
    FROM borrowing b
    JOIN equipment e ON b.equipment_id = e.id
    LEFT JOIN borrowing_history bh ON b.id = bh.borrowing_id AND bh.action = 'borrow'
    LEFT JOIN users u ON bh.approver_id = u.id
    WHERE b.user_id = ?
    ORDER BY b.borrow_date DESC
  ");
  $stmt->execute([$userId]);
  $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // นับจำนวนรวม
  $totalStmt = $conn->prepare("
    SELECT COUNT(*) as total_items 
    FROM borrowing 
    WHERE user_id = ?
  ");
  $totalStmt->execute([$userId]);
  $total = $totalStmt->fetch(PDO::FETCH_ASSOC);

  Response::success('OK', [
    'user' => $user,
    'items' => $items,
    'summary' => [
      'total_items' => (int)$total['total_items']
    ]
  ]);
}

function createHistory(PDO $conn, array $input) {
  $required = ['user_id', 'action'];
  foreach ($required as $f) {
    if (!isset($input[$f]) || trim($input[$f]) === '') {
      Response::error('กรุณากรอกข้อมูลให้ครบถ้วน', 400);
    }
  }

  $user_id = (int)$input['user_id'];
  $equipment_id = isset($input['equipment_id']) ? (int)$input['equipment_id'] : null;
  $action = Security::sanitize($input['action']);
  $action_date = isset($input['action_date']) ? Security::sanitize($input['action_date']) : date('Y-m-d H:i:s');
  $notes = isset($input['notes']) ? Security::sanitize($input['notes']) : null;
  $approver_name = isset($input['approver_name']) ? Security::sanitize($input['approver_name']) : null;
  $equipment_names = isset($input['equipment_names']) ? Security::sanitize($input['equipment_names']) : null;

  $ins = $conn->prepare('
    INSERT INTO borrowing_history 
    (user_id, equipment_id, action, action_date, notes, approver_name, equipment_names) 
    VALUES (:user_id, :equipment_id, :action, :action_date, :notes, :approver_name, :equipment_names)
  ');
  $ins->bindParam(':user_id', $user_id, PDO::PARAM_INT);
  $ins->bindParam(':equipment_id', $equipment_id, PDO::PARAM_INT);
  $ins->bindParam(':action', $action, PDO::PARAM_STR);
  $ins->bindParam(':action_date', $action_date, PDO::PARAM_STR);
  $ins->bindParam(':notes', $notes, PDO::PARAM_STR);
  $ins->bindParam(':approver_name', $approver_name, PDO::PARAM_STR);
  $ins->bindParam(':equipment_names', $equipment_names, PDO::PARAM_STR);
  
  if (!$ins->execute()) {
    Response::error('ไม่สามารถบันทึกประวัติได้', 500);
  }

  Response::success('บันทึกประวัติสำเร็จ');
}

?>
