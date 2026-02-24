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
      listBorrowing($conn);
      break;
    case 'POST':
      createBorrowing($conn, $input);
      break;
    case 'PUT':
      updateBorrowing($conn, $input);
      break;
    case 'DELETE':
      deleteBorrowing($conn, $input);
      break;
    default:
      Response::error('Method not allowed', 405);
  }
} catch (Throwable $e) {
  error_log('Borrowing API error: ' . $e->getMessage());
  Response::error('Server error', 500);
}

function listBorrowing(PDO $conn) {
  $stmt = $conn->prepare("
    SELECT b.*, u.fullname, u.student_id, e.name as equipment_name, e.category
    FROM borrowing b
    JOIN users u ON b.user_id = u.id
    JOIN equipment e ON b.equipment_id = e.id
    ORDER BY b.created_at DESC
  ");
  $stmt->execute();
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Response::success('OK', ['borrowing' => $rows]);
}

function createBorrowing(PDO $conn, array $input) {
  $required = ['user_id', 'equipment_id', 'borrow_date', 'due_date'];
  foreach ($required as $f) {
    if (!isset($input[$f]) || trim($input[$f]) === '') {
      Response::error('กรุณากรอกข้อมูลให้ครบถ้วน', 400);
    }
  }

  $user_id = (int)$input['user_id'];
  $equipment_id = (int)$input['equipment_id'];
  $borrow_date = Security::sanitize($input['borrow_date']);
  $due_date = Security::sanitize($input['due_date']);
  $notes = isset($input['notes']) ? Security::sanitize($input['notes']) : null;
  $quantity = isset($input['quantity']) ? (int)$input['quantity'] : 1;

  // Check if equipment is available
  $check = $conn->prepare('SELECT quantity_available FROM equipment WHERE id = :id');
  $check->bindParam(':id', $equipment_id, PDO::PARAM_INT);
  $check->execute();
  $equipment = $check->fetch(PDO::FETCH_ASSOC);
  
  if (!$equipment) {
    Response::error('ไม่พบอุปกรณ์', 404);
  }
  
  if ($equipment['quantity_available'] < $quantity) {
    Response::error('อุปกรณ์ไม่เพียงพอ', 400);
  }

  $conn->beginTransaction();
  
  try {
    // Create borrowing record
    $ins = $conn->prepare('INSERT INTO borrowing (user_id, equipment_id, borrow_date, due_date, notes) VALUES (:user_id, :equipment_id, :borrow_date, :due_date, :notes)');
    $ins->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $ins->bindParam(':equipment_id', $equipment_id, PDO::PARAM_INT);
    $ins->bindParam(':borrow_date', $borrow_date, PDO::PARAM_STR);
    $ins->bindParam(':due_date', $due_date, PDO::PARAM_STR);
    $ins->bindParam(':notes', $notes, PDO::PARAM_STR);
    $ins->execute();
    
    $borrowing_id = dbLastInsertId($conn, 'borrowing');
    
    // Update equipment quantity
    $upd = $conn->prepare('UPDATE equipment SET quantity_available = quantity_available - :qty WHERE id = :id');
    $upd->bindParam(':qty', $quantity, PDO::PARAM_INT);
    $upd->bindParam(':id', $equipment_id, PDO::PARAM_INT);
    $upd->execute();
    
    // Create history entry
    $hist = $conn->prepare('INSERT INTO borrowing_history (borrowing_id, user_id, equipment_id, action, action_date, notes) VALUES (:borrowing_id, :user_id, :equipment_id, :action, NOW(), :notes)');
    $hist->bindParam(':borrowing_id', $borrowing_id, PDO::PARAM_INT);
    $hist->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $hist->bindParam(':equipment_id', $equipment_id, PDO::PARAM_INT);
    $action = 'borrow';
    $hist->bindParam(':action', $action, PDO::PARAM_STR);
    $hist->bindParam(':notes', $notes, PDO::PARAM_STR);
    $hist->execute();
    
    $conn->commit();
    Response::success('บันทึกการยืมสำเร็จ');
  } catch (Exception $e) {
    $conn->rollBack();
    throw $e;
  }
}

function updateBorrowing(PDO $conn, array $input) {
  if (!isset($input['id']) || !is_numeric($input['id'])) {
    Response::error('ต้องระบุ ID', 400);
  }
  
  $id = (int)$input['id'];
  $action = isset($input['action']) ? $input['action'] : '';
  
  if ($action === 'return') {
    // Return equipment
    $sel = $conn->prepare('SELECT * FROM borrowing WHERE id = :id');
    $sel->bindParam(':id', $id, PDO::PARAM_INT);
    $sel->execute();
    $borrowing = $sel->fetch(PDO::FETCH_ASSOC);
    
    if (!$borrowing) {
      Response::error('ไม่พบข้อมูลการยืม', 404);
    }
    
    $conn->beginTransaction();
    
    try {
      // Update borrowing record
      $upd = $conn->prepare('UPDATE borrowing SET status = :status, return_date = NOW() WHERE id = :id');
      $status = 'returned';
      $upd->bindParam(':status', $status, PDO::PARAM_STR);
      $upd->bindParam(':id', $id, PDO::PARAM_INT);
      $upd->execute();
      

      $upd_eq = $conn->prepare('UPDATE equipment SET quantity_available = quantity_available + 1 WHERE id = :id');
      $upd_eq->bindParam(':id', $borrowing['equipment_id'], PDO::PARAM_INT);
      $upd_eq->execute();
      
      // Create history entry
      $hist = $conn->prepare('INSERT INTO borrowing_history (borrowing_id, user_id, equipment_id, action, action_date, notes) VALUES (:borrowing_id, :user_id, :equipment_id, :action, NOW(), :notes)');
      $hist->bindParam(':borrowing_id', $id, PDO::PARAM_INT);
      $hist->bindParam(':user_id', $borrowing['user_id'], PDO::PARAM_INT);
      $hist->bindParam(':equipment_id', $borrowing['equipment_id'], PDO::PARAM_INT);
      $action = 'return';
      $hist->bindParam(':action', $action, PDO::PARAM_STR);
      $notes = 'คืนอุปกรณ์';
      $hist->bindParam(':notes', $notes, PDO::PARAM_STR);
      $hist->execute();
      
      $conn->commit();
      Response::success('คืนอุปกรณ์สำเร็จ');
    } catch (Exception $e) {
      $conn->rollBack();
      throw $e;
    }
  } else {
    Response::error('ไม่รองรับการกระทำนี้', 400);
  }
}

function deleteBorrowing(PDO $conn, array $input) {
  if (!isset($input['id']) || !is_numeric($input['id'])) {
    Response::error('ต้องระบุ ID', 400);
  }
  
  $id = (int)$input['id'];
  $del = $conn->prepare('DELETE FROM borrowing WHERE id = :id');
  $del->bindParam(':id', $id, PDO::PARAM_INT);
  if (!$del->execute()) {
    Response::error('ลบไม่สำเร็จ', 500);
  }
  Response::success('ลบรายการสำเร็จ');
}

?>
