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
      if (isset($_GET['borrowing_id'])) {
        getBorrowerDetails($conn, (int)$_GET['borrowing_id']);
      } else {
        listActiveBorrowers($conn);
      }
      break;
    case 'POST':
      returnEquipment($conn, $input);
      break;
    default:
      Response::error('Method not allowed', 405);
  }
} catch (Throwable $e) {
  error_log('Return Equipment API error: ' . $e->getMessage());
  Response::error('Server error: ' . $e->getMessage(), 500);
}


function listActiveBorrowers(PDO $conn) {
  $driver = $conn->getAttribute(PDO::ATTR_DRIVER_NAME);
  $warningDateExpr = $driver === 'pgsql'
    ? "NOW() + INTERVAL '3 days'"
    : 'DATE_ADD(NOW(), INTERVAL 3 DAY)';
  $daysRemainingExpr = $driver === 'pgsql'
    ? "CAST(DATE_PART('day', b.due_date - NOW()) AS INT)"
    : 'DATEDIFF(b.due_date, NOW())';
  $borrowingIdsExpr = $driver === 'pgsql'
    ? "STRING_AGG(DISTINCT b.id::text, ',')"
    : 'GROUP_CONCAT(DISTINCT b.id)';

  $stmt = $conn->prepare("
    SELECT 
      MIN(b.id) as borrowing_id,
      b.user_id,
      u.fullname,
      u.student_id,
      b.borrow_date,
      b.due_date,
      COUNT(DISTINCT b.equipment_id) as unique_equipment,
      COUNT(b.id) as total_items,
      CASE 
        WHEN b.due_date < NOW() THEN 'overdue'
        WHEN b.due_date < {$warningDateExpr} THEN 'warning'
        ELSE 'normal'
      END as status,
      {$daysRemainingExpr} as days_remaining,
      {$borrowingIdsExpr} as borrowing_ids
    FROM borrowing b
    JOIN users u ON b.user_id = u.id
    WHERE b.status = 'borrowed'
    GROUP BY b.user_id, u.fullname, u.student_id, b.borrow_date, b.due_date
    ORDER BY 
      CASE 
        WHEN b.due_date < NOW() THEN 1
        WHEN b.due_date < {$warningDateExpr} THEN 2
        ELSE 3
      END,
      b.due_date ASC
  ");
  $stmt->execute();
  $borrowers = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  Response::success('ดึงข้อมูลผู้ยืมสำเร็จ', ['borrowers' => $borrowers]);
}
function getBorrowerDetails(PDO $conn, int $borrowingId) {
  $driver = $conn->getAttribute(PDO::ATTR_DRIVER_NAME);
  $borrowingIdsExpr = $driver === 'pgsql'
    ? "STRING_AGG(b.id::text, ',')"
    : 'GROUP_CONCAT(b.id)';

  $mainBorrowingStmt = $conn->prepare("
    SELECT 
      b.user_id,
      b.borrow_date,
      b.due_date,
      u.fullname,
      u.student_id,
      u.email
    FROM borrowing b
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ? AND b.status = 'borrowed'
  ");
  $mainBorrowingStmt->execute([$borrowingId]);
  $mainBorrowing = $mainBorrowingStmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$mainBorrowing) {
    Response::error('ไม่พบข้อมูลการยืม', 404);
  }
  
  $itemsStmt = $conn->prepare("
    SELECT 
      e.id as equipment_id,
      e.name as equipment_name,
      e.category,
      e.image_url,
      COUNT(b.id) as quantity_borrowed,
      MIN(b.borrow_date) as borrow_date,
      MIN(b.due_date) as due_date,
      {$borrowingIdsExpr} as borrowing_ids
    FROM borrowing b
    JOIN equipment e ON b.equipment_id = e.id
    WHERE b.user_id = ? 
      AND b.borrow_date = ? 
      AND b.due_date = ? 
      AND b.status = 'borrowed'
    GROUP BY e.id, e.name, e.category, e.image_url
    ORDER BY e.name ASC
  ");
  $itemsStmt->execute([
    $mainBorrowing['user_id'],
    $mainBorrowing['borrow_date'],
    $mainBorrowing['due_date']
  ]);
  $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
  
  $user = [
    'id' => $mainBorrowing['user_id'],
    'fullname' => $mainBorrowing['fullname'],
    'student_id' => $mainBorrowing['student_id'],
    'email' => $mainBorrowing['email']
  ];
  
  Response::success('ดึงข้อมูลรายละเอียดสำเร็จ', [
    'user' => $user,
    'items' => $items
  ]);
}
function returnEquipment(PDO $conn, array $input) {
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!isset($input['borrowing_id']) || !isset($input['items']) || !is_array($input['items'])) {
    Response::error('ข้อมูลไม่ครบถ้วน', 400);
  }
  
  $borrowingId = (int)$input['borrowing_id'];
  $items = $input['items'];
  $staffId = isset($input['staff_id']) ? (int)$input['staff_id'] : null;
  $staffName = isset($input['staff_name']) ? Security::sanitize($input['staff_name']) : 'เจ้าหน้าที่';
  
  $conn->beginTransaction();
  
  try {
    $totalReturned = 0;
    $totalDamaged = 0;
    $totalLost = 0;
    
    // ดึงข้อมูลการยืมหลักเพื่อหา user_id, borrow_date, due_date
    $mainBorrowingStmt = $conn->prepare("
      SELECT user_id, borrow_date, due_date FROM borrowing 
      WHERE id = ? AND status = 'borrowed'
    ");
    $mainBorrowingStmt->execute([$borrowingId]);
    $mainBorrowing = $mainBorrowingStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$mainBorrowing) {
      Response::error('ไม่พบข้อมูลการยืม', 404);
    }
    
    $userId = $mainBorrowing['user_id'];
    $borrowDate = $mainBorrowing['borrow_date'];
    $dueDate = $mainBorrowing['due_date'];
    
    foreach ($items as $item) {
      $equipmentId = (int)$item['equipment_id'];
      $quantityReturned = (int)($item['quantity_returned'] ?? 0);
      $quantityDamaged = (int)($item['quantity_damaged'] ?? 0);
      $quantityLost = (int)($item['quantity_lost'] ?? 0);
      $notes = isset($item['notes']) ? Security::sanitize($item['notes']) : '';
      
      // ดึงรายการ borrowing ของอุปกรณ์นี้ในคำขอเดียวกัน
      $borrowingStmt = $conn->prepare("
        SELECT id FROM borrowing 
        WHERE user_id = ? AND equipment_id = ? AND borrow_date = ? AND due_date = ? AND status = 'borrowed'
        ORDER BY id ASC
      ");
      $borrowingStmt->execute([$userId, $equipmentId, $borrowDate, $dueDate]);
      $borrowingRecords = $borrowingStmt->fetchAll(PDO::FETCH_ASSOC);
      
      $totalQuantity = count($borrowingRecords);
      $processedCount = 0;
      
      // อัปเดตสถานะการยืม - คืนปกติ
      for ($i = 0; $i < $quantityReturned && $processedCount < $totalQuantity; $i++) {
        $currentBorrowingId = $borrowingRecords[$processedCount]['id'];
        
        $updateStmt = $conn->prepare("
          UPDATE borrowing 
          SET status = 'returned', return_date = NOW()
          WHERE id = ?
        ");
        $updateStmt->execute([$currentBorrowingId]);
        
        // บันทึกประวัติการคืน
        $historyStmt = $conn->prepare("
          INSERT INTO borrowing_history 
          (borrowing_id, user_id, equipment_id, action, action_date, notes, approver_id, approver_name) 
          VALUES (?, ?, ?, 'return', NOW(), ?, ?, ?)
        ");
        $historyStmt->execute([
          $currentBorrowingId,
          $userId,
          $equipmentId,
          'คืนปกติ' . ($notes ? ' - ' . $notes : ''),
          $staffId,
          $staffName
        ]);
        
        // เพิ่มจำนวนอุปกรณ์กลับ
        $equipmentStmt = $conn->prepare("
          UPDATE equipment 
          SET quantity_available = quantity_available + 1,
              status = CASE 
                WHEN quantity_available + 1 >= quantity_total THEN 'available'
                WHEN quantity_available + 1 > 5 THEN 'available'
                WHEN quantity_available + 1 > 0 THEN 'limited'
                ELSE 'unavailable'
              END
          WHERE id = ?
        ");
        $equipmentStmt->execute([$equipmentId]);
        
        $processedCount++;
        $totalReturned++;
      }
      
      // อัปเดตสถานะการยืม - เสียหาย
      for ($i = 0; $i < $quantityDamaged && $processedCount < $totalQuantity; $i++) {
        $currentBorrowingId = $borrowingRecords[$processedCount]['id'];
        
        $updateStmt = $conn->prepare("
          UPDATE borrowing 
          SET status = 'returned', return_date = NOW()
          WHERE id = ?
        ");
        $updateStmt->execute([$currentBorrowingId]);
        
        // บันทึกประวัติการคืน
        $historyStmt = $conn->prepare("
          INSERT INTO borrowing_history 
          (borrowing_id, user_id, equipment_id, action, action_date, notes, approver_id, approver_name) 
          VALUES (?, ?, ?, 'return', NOW(), ?, ?, ?)
        ");
        $historyStmt->execute([
          $currentBorrowingId,
          $userId,
          $equipmentId,
          'คืนชำรุด/เสียหาย - ' . $notes,
          $staffId,
          $staffName
        ]);
        
        $processedCount++;
        $totalDamaged++;
      }
      
      // อัปเดตสถานะการยืม - หาย
      for ($i = 0; $i < $quantityLost && $processedCount < $totalQuantity; $i++) {
        $currentBorrowingId = $borrowingRecords[$processedCount]['id'];
        
        $updateStmt = $conn->prepare("
          UPDATE borrowing 
          SET status = 'lost', return_date = NOW()
          WHERE id = ?
        ");
        $updateStmt->execute([$currentBorrowingId]);
        
        // บันทึกประวัติการคืน
        $historyStmt = $conn->prepare("
          INSERT INTO borrowing_history 
          (borrowing_id, user_id, equipment_id, action, action_date, notes, approver_id, approver_name) 
          VALUES (?, ?, ?, 'lost', NOW(), ?, ?, ?)
        ");
        $historyStmt->execute([
          $currentBorrowingId,
          $userId,
          $equipmentId,
          'อุปกรณ์สูญหาย - ' . $notes,
          $staffId,
          $staffName
        ]);
        
        $processedCount++;
        $totalLost++;
      }
    }
    
    $conn->commit();
    
    Response::success('บันทึกการคืนอุปกรณ์สำเร็จ', [
      'summary' => [
        'total_returned' => $totalReturned,
        'total_damaged' => $totalDamaged,
        'total_lost' => $totalLost
      ]
    ]);
    
  } catch (Exception $e) {
    $conn->rollBack();
    throw $e;
  }
}

?>


