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
      listEquipment($conn);
      break;
    case 'PUT':
      updateEquipment($conn, $input);
      break;
    case 'DELETE':
      deleteEquipment($conn, $input);
      break;
    case 'POST':
      createEquipment($conn, $input);
      break;
    default:
      Response::error('Method not allowed', 405);
  }
} catch (Throwable $e) {
  error_log('Equipment API error: ' . $e->getMessage());
  Response::error('Server error', 500);
}

function listEquipment($conn) {
  $stmt = $conn->prepare("SELECT id, name, description, category, image_url, quantity_total, quantity_available, status, created_at, updated_at FROM equipment ORDER BY id ASC");
  $stmt->execute();
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Response::success('OK', ['equipment' => $rows]);
}

function createEquipment($conn, $input) {
  $required = ['name', 'category', 'status'];
  foreach ($required as $f) {
    if (!isset($input[$f]) || trim($input[$f]) === '') {
      Response::error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 400);
    }
  }

  $name = Security::sanitize($input['name']);
  $description = isset($input['description']) ? Security::sanitize($input['description']) : '';
  $category = Security::sanitize($input['category']);
  $image_url = isset($input['image_url']) ? Security::sanitize($input['image_url']) : null;
  $quantity_total = isset($input['quantity_total']) ? (int)$input['quantity_total'] : 0;
  $quantity_available = isset($input['quantity_available']) ? (int)$input['quantity_available'] : $quantity_total;
  $status = Security::sanitize($input['status']);

  $sql = 'INSERT INTO equipment (name, description, category, image_url, quantity_total, quantity_available, status) VALUES (:name, :description, :category, :image_url, :qt, :qa, :status)';
  $stmt = $conn->prepare($sql);
  $stmt->bindParam(':name', $name, PDO::PARAM_STR);
  $stmt->bindParam(':description', $description, PDO::PARAM_STR);
  $stmt->bindParam(':category', $category, PDO::PARAM_STR);
  $stmt->bindParam(':image_url', $image_url, PDO::PARAM_STR);
  $stmt->bindParam(':qt', $quantity_total, PDO::PARAM_INT);
  $stmt->bindParam(':qa', $quantity_available, PDO::PARAM_INT);
  $stmt->bindParam(':status', $status, PDO::PARAM_STR);
  if (!$stmt->execute()) {
    Response::error('ไม่สามารถเพิ่มอุปกรณ์ได้', 500);
  }

  $id = dbLastInsertId($conn, 'equipment');
  $sel = $conn->prepare('SELECT id, name, description, category, image_url, quantity_total, quantity_available, status, created_at FROM equipment WHERE id = :id');
  $sel->bindParam(':id', $id, PDO::PARAM_INT);
  $sel->execute();
  $row = $sel->fetch(PDO::FETCH_ASSOC);
  Response::success('เพิ่มอุปกรณ์สำเร็จ', ['equipment' => $row], 201);
}

function updateEquipment($conn, $input) {
  if (!isset($input['id']) || !is_numeric($input['id'])) {
    Response::error('ต้องระบุ ID อุปกรณ์', 400);
  }
  $id = (int)$input['id'];

  $stmt = $conn->prepare('SELECT id FROM equipment WHERE id = :id');
  $stmt->bindParam(':id', $id, PDO::PARAM_INT);
  $stmt->execute();
  if (!$stmt->fetch()) {
    Response::error('ไม่พบทึกรายการอุปกรณ์', 404);
  }

  $fields = [];
  $params = [':id' => $id];

  $map = [
    'name' => PDO::PARAM_STR,
    'description' => PDO::PARAM_STR,
    'category' => PDO::PARAM_STR,
    'image_url' => PDO::PARAM_STR,
    'quantity_total' => PDO::PARAM_INT,
    'quantity_available' => PDO::PARAM_INT,
    'status' => PDO::PARAM_STR,
  ];

  foreach ($map as $key => $paramType) {
    if (array_key_exists($key, $input)) {
      $fields[] = "$key = :$key";
      $params[":" . $key] = $paramType === PDO::PARAM_INT ? (int)$input[$key] : Security::sanitize($input[$key]);
    }
  }

  if (empty($fields)) {
    Response::error('ไม่มีข้อมูลที่ต้องการแก้ไข', 400);
  }

  $sql = 'UPDATE equipment SET ' . implode(', ', $fields) . ' WHERE id = :id';
  $upd = $conn->prepare($sql);
  foreach ($params as $k => $v) {
    $type = is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR;
    $upd->bindValue($k, $v, $type);
  }
  if (!$upd->execute()) {
    Response::error('ไม่สามารถแก้ไขข้อมูลอุปกรณ์ได้', 500);
  }

  $sel = $conn->prepare('SELECT id, name, description, category, image_url, quantity_total, quantity_available, status, updated_at FROM equipment WHERE id = :id');
  $sel->bindParam(':id', $id, PDO::PARAM_INT);
  $sel->execute();
  $row = $sel->fetch(PDO::FETCH_ASSOC);
  Response::success('แก้ไขอุปกรณ์สำเร็จ', ['equipment' => $row]);
}

function deleteEquipment($conn, $input) {
  if (!isset($input['id']) || !is_numeric($input['id'])) {
    Response::error('ต้องระบุ ID อุปกรณ์', 400);
  }
  $id = (int)$input['id'];

  $stmt = $conn->prepare('SELECT id FROM equipment WHERE id = :id');
  $stmt->bindParam(':id', $id, PDO::PARAM_INT);
  $stmt->execute();
  if (!$stmt->fetch()) {
    Response::error('ไม่พบทึกรายการอุปกรณ์', 404);
  }

  $del = $conn->prepare('DELETE FROM equipment WHERE id = :id');
  $del->bindParam(':id', $id, PDO::PARAM_INT);
  if (!$del->execute()) {
    Response::error('ไม่สามารถลบอุปกรณ์ได้', 500);
  }

  Response::success('ลบอุปกรณ์สำเร็จ');
}

?>


