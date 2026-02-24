<?php
require_once __DIR__ . '/../Connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  Response::error('ต้องใช้ GET Request เท่านั้น', 405);
}

try {
  $db = new Database();
  $conn = $db->getConnection();

  $type = $_GET['type'] ?? '';

  switch ($type) {
    case 'most_borrowed':
      getMostBorrowedEquipment($conn);
      break;
    case 'most_damaged':
      getMostDamagedEquipment($conn);
      break;
    default:
      Response::error('ต้องระบุ type parameter (most_borrowed หรือ most_damaged)', 400);
  }
} catch (Throwable $e) {
  error_log('Equipment Stats API error: ' . $e->getMessage());
  Response::error('Server error', 500);
}

function getMostBorrowedEquipment($conn) {
  $limit = (int)($_GET['limit'] ?? 5);
  
  $query = "
    SELECT 
      e.id,
      e.name,
      e.category,
      e.image_url,
      COUNT(b.id) as borrow_count
    FROM equipment e
    LEFT JOIN borrowing b ON e.id = b.equipment_id 
      AND b.status IN ('borrowed', 'returned')
    GROUP BY e.id, e.name, e.category, e.image_url
    ORDER BY borrow_count DESC, e.name ASC
    LIMIT :limit
  ";
  
  $stmt = $conn->prepare($query);
  $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
  $stmt->execute();
  $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  Response::success('OK', ['equipment' => $results]);
}

function getMostDamagedEquipment($conn) {
  $limit = (int)($_GET['limit'] ?? 5);
  
  $query = "
    SELECT 
      e.id,
      e.name,
      e.category,
      e.image_url,
      COUNT(b.id) as damage_count
    FROM equipment e
    LEFT JOIN borrowing b ON e.id = b.equipment_id 
      AND b.status = 'lost'
    GROUP BY e.id, e.name, e.category, e.image_url
    HAVING damage_count > 0
    ORDER BY damage_count DESC, e.name ASC
    LIMIT :limit
  ";
  
  $stmt = $conn->prepare($query);
  $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
  $stmt->execute();
  $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  Response::success('OK', ['equipment' => $results]);
}

?>

