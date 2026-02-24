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
      listUsers($conn);
      break;
    case 'POST':
      createUser($conn, $input);
      break;
    case 'PUT':
      updateUser($conn, $input);
      break;
    case 'DELETE':
      deleteUser($conn, $input);
      break;
    default:
      Response::error('Method not allowed', 405);
  }
} catch (Throwable $e) {
  error_log("Users API error: " . $e->getMessage());
  Response::error('Server error', 500);
}

function listUsers($conn) {
  $stmt = $conn->prepare("SELECT id, student_id, fullname, email, role, status FROM users ORDER BY id ASC");
  $stmt->execute();
  $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

  Response::success('OK', ['users' => $users]);
}

function validateUserData($conn, $input, $isUpdate = false, $userId = null) {
  $required = $isUpdate ? [] : ['fullname', 'email', 'student_id', 'password', 'confirm_password'];
  $missing = [];
  foreach ($required as $f) {
    if (!isset($input[$f]) || trim($input[$f]) === '') {
      $missing[] = $f;
    }
  }
  if (!empty($missing)) {
    Response::error('กรุณากรอกข้อมูลให้ครบถ้วน: ' . implode(', ', $missing), 400);
  }

  if (isset($input['fullname']) && strlen($input['fullname']) < 2) {
    Response::error('ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร', 400);
  }
  if (isset($input['email']) && !Security::validateEmail($input['email'])) {
    Response::error('รูปแบบอีเมลไม่ถูกต้อง (รหัส 12 หลัก + -st@rmutsb.ac.th)', 400);
  }
  if (isset($input['student_id']) && !Security::validateStudentId($input['student_id'])) {
    Response::error('รูปแบบรหัสนักศึกษาไม่ถูกต้อง (รหัส 12 หลัก)', 400);
  }
  if (isset($input['password']) && strlen($input['password']) < 6) {
    Response::error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 400);
  }
  if (!$isUpdate && isset($input['password']) && isset($input['confirm_password']) && $input['password'] !== $input['confirm_password']) {
    Response::error('รหัสผ่านไม่ตรงกัน', 400);
  }
  if (isset($input['email']) && isset($input['student_id'])) {
    $email_sid = substr($input['email'], 0, 12);
    if ($email_sid !== $input['student_id']) {
      Response::error('รหัสนักศึกษาในอีเมลไม่ตรงกับรหัสนักศึกษาที่กรอก', 400);
    }
  }
}

function createUser($conn, $input) {
  if (!Input::isPost()) {
    Response::error('ต้องใช้ POST Request เท่านั้น', 405);
  }

  validateUserData($conn, $input);

  $fullname = Security::sanitize($input['fullname']);
  $email = Security::sanitize($input['email']);
  $student_id = Security::sanitize($input['student_id']);
  $password = $input['password'];
  
  $roleInput = isset($input['role']) ? Security::sanitize($input['role']) : 'user';
  if ($roleInput === 'student') { $roleInput = 'user'; }
  if ($roleInput === 'teacher') { $roleInput = 'staff'; }
  $role = $roleInput;
  $status = isset($input['status']) ? Security::sanitize($input['status']) : 'active';

  $stmt = $conn->prepare('SELECT id FROM users WHERE student_id = :sid OR email = :email LIMIT 1');
  $stmt->bindParam(':sid', $student_id, PDO::PARAM_STR);
  $stmt->bindParam(':email', $email, PDO::PARAM_STR);
  $stmt->execute();
  if ($stmt->fetch()) {
    Response::error('อีเมลหรือรหัสนักศึกษามีผู้ใช้งานแล้ว', 409);
  }

  $hashed = Security::hashPassword($password);

  $ins = $conn->prepare('INSERT INTO users (student_id, email, fullname, password, role, status) VALUES (:sid, :email, :fullname, :pwd, :role, :status)');
  $ins->bindParam(':sid', $student_id, PDO::PARAM_STR);
  $ins->bindParam(':email', $email, PDO::PARAM_STR);
  $ins->bindParam(':fullname', $fullname, PDO::PARAM_STR);
  $ins->bindParam(':pwd', $hashed, PDO::PARAM_STR);
  $ins->bindParam(':role', $role, PDO::PARAM_STR);
  $ins->bindParam(':status', $status, PDO::PARAM_STR);
  if (!$ins->execute()) {
    Response::error('ไม่สามารถเพิ่มผู้ใช้ได้', 500);
  }

  $newId = dbLastInsertId($conn, 'users');
  $sel = $conn->prepare('SELECT id, student_id, email, fullname, role, status, created_at FROM users WHERE id = :id');
  $sel->bindParam(':id', $newId, PDO::PARAM_INT);
  $sel->execute();
  $user = $sel->fetch(PDO::FETCH_ASSOC);

  Response::success('เพิ่มผู้ใช้สำเร็จ', ['user' => $user], 201);
}

function updateUser($conn, $input) {
  if (!isset($input['id']) || !is_numeric($input['id'])) {
    Response::error('ต้องระบุ ID ผู้ใช้', 400);
  }

  $id = (int)$input['id'];
  $fullname = isset($input['fullname']) ? Security::sanitize($input['fullname']) : null;
  $email = isset($input['email']) ? Security::sanitize($input['email']) : null;
  $student_id = isset($input['student_id']) ? Security::sanitize($input['student_id']) : null;

  $role = isset($input['role']) ? Security::sanitize($input['role']) : null;
  if ($role === 'student') { $role = 'user'; }
  if ($role === 'teacher') { $role = 'staff'; }
  $status = isset($input['status']) ? Security::sanitize($input['status']) : null;

  if ($fullname && strlen($fullname) < 2) {
    Response::error('ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร', 400);
  }
  if ($email && !Security::validateEmail($email)) {
    Response::error('รูปแบบอีเมลไม่ถูกต้อง (รหัส 12 หลัก + -st@rmutsb.ac.th)', 400);
  }
  if ($student_id && !Security::validateStudentId($student_id)) {
    Response::error('รูปแบบรหัสนักศึกษาไม่ถูกต้อง (รหัส 12 หลัก)', 400);
  }
  if ($email && $student_id) {
    $email_sid = substr($email, 0, 12);
    if ($email_sid !== $student_id) {
      Response::error('รหัสนักศึกษาในอีเมลไม่ตรงกับรหัสนักศึกษาที่กรอก', 400);
    }
  }

  $stmt = $conn->prepare('SELECT id FROM users WHERE id = :id');
  $stmt->bindParam(':id', $id, PDO::PARAM_INT);
  $stmt->execute();
  if (!$stmt->fetch()) {
    Response::error('ไม่พบผู้ใช้ที่ต้องการแก้ไข', 404);
  }

  validateUserData($conn, $input, true, $id);

  if ($email || $student_id) {
    $check = $conn->prepare('SELECT id FROM users WHERE (email = :email OR student_id = :sid) AND id != :id LIMIT 1');
    $check->bindParam(':email', $email, PDO::PARAM_STR);
    $check->bindParam(':sid', $student_id, PDO::PARAM_STR);
    $check->bindParam(':id', $id, PDO::PARAM_INT);
    $check->execute();
    if ($check->fetch()) {
      Response::error('อีเมลหรือรหัสนักศึกษามีผู้ใช้งานแล้ว', 409);
    }
  }

  $fields = [];
  $params = [':id' => $id];
  
  if ($fullname) {
    $fields[] = 'fullname = :fullname';
    $params[':fullname'] = $fullname;
  }
  if ($email) {
    $fields[] = 'email = :email';
    $params[':email'] = $email;
  }
  if ($student_id) {
    $fields[] = 'student_id = :student_id';
    $params[':student_id'] = $student_id;
  }
  if ($role) {
    $fields[] = 'role = :role';
    $params[':role'] = $role;
  }
  if ($status) {
    $fields[] = 'status = :status';
    $params[':status'] = $status;
  }

  if (empty($fields)) {
    Response::error('ไม่มีข้อมูลที่ต้องการแก้ไข', 400);
  }

  $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
  $stmt = $conn->prepare($sql);
  
  foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value);
  }

  if (!$stmt->execute()) {
    Response::error('ไม่สามารถแก้ไขผู้ใช้ได้', 500);
  }

  $sel = $conn->prepare('SELECT id, student_id, email, fullname, role, status, updated_at FROM users WHERE id = :id');
  $sel->bindParam(':id', $id, PDO::PARAM_INT);
  $sel->execute();
  $user = $sel->fetch(PDO::FETCH_ASSOC);

  Response::success('แก้ไขผู้ใช้สำเร็จ', ['user' => $user]);
}

function deleteUser($conn, $input) {
  if (!isset($input['id']) || !is_numeric($input['id'])) {
    Response::error('ต้องระบุ ID ผู้ใช้', 400);
  }

  $id = (int)$input['id'];

  $stmt = $conn->prepare('SELECT id FROM users WHERE id = :id');
  $stmt->bindParam(':id', $id, PDO::PARAM_INT);
  $stmt->execute();
  if (!$stmt->fetch()) {
    Response::error('ไม่พบผู้ใช้ที่ต้องการลบ', 404);
  }

  $del = $conn->prepare('DELETE FROM users WHERE id = :id');
  $del->bindParam(':id', $id, PDO::PARAM_INT);
  
  if (!$del->execute()) {
    Response::error('ไม่สามารถลบผู้ใช้ได้', 500);
  }

  Response::success('ลบผู้ใช้สำเร็จ');
}
?>


