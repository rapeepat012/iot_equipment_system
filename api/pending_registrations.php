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

  ensurePendingRegistrationsTable($conn);

  $method = $_SERVER['REQUEST_METHOD'];
  $input = json_decode(file_get_contents('php://input'), true);

  switch ($method) {
    case 'GET':
      listPending($conn);
      break;
    case 'POST':
      createPending($conn, $input);
      break;
    case 'PUT':
      updatePending($conn, $input);
      break;
    case 'DELETE':
      deletePending($conn, $input);
      break;
    default:
      Response::error('Method not allowed', 405);
  }
} catch (Throwable $e) {
  error_log('Pending Registration API error: ' . $e->getMessage());
  Response::error('Server error', 500);
}

function ensurePendingRegistrationsTable(PDO $conn): void {
  $driver = $conn->getAttribute(PDO::ATTR_DRIVER_NAME);

  if ($driver === 'pgsql') {
    $conn->exec("
      CREATE TABLE IF NOT EXISTS pending_registrations (
        id BIGSERIAL PRIMARY KEY,
        fullname VARCHAR(100) NOT NULL,
        email VARCHAR(50) NOT NULL UNIQUE,
        student_id VARCHAR(14) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        notes TEXT DEFAULT NULL,
        requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL DEFAULT NULL,
        CONSTRAINT chk_pending_role CHECK (role IN ('admin','staff','user')),
        CONSTRAINT chk_pending_status CHECK (status IN ('pending','approved','rejected'))
      )
    ");
    return;
  }

  $conn->exec("
    CREATE TABLE IF NOT EXISTS pending_registrations (
      id INT(11) NOT NULL AUTO_INCREMENT,
      fullname VARCHAR(100) NOT NULL,
      email VARCHAR(50) NOT NULL,
      student_id VARCHAR(14) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','staff','user') NOT NULL DEFAULT 'user',
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      notes TEXT DEFAULT NULL,
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_student_id (student_id),
      UNIQUE KEY uniq_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  ");
}

function listPending(PDO $conn) {
  $stmt = $conn->prepare("SELECT id, fullname, email, student_id, role, status, requested_at, reviewed_at FROM pending_registrations WHERE status = 'pending' ORDER BY requested_at ASC");
  $stmt->execute();
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Response::success('OK', ['requests' => $rows]);
}

function createPending(PDO $conn, array $input) {
  $required = ['fullname','email','student_id','password'];
  foreach ($required as $f) {
    if (!isset($input[$f]) || trim($input[$f]) === '') {
      Response::error('กรุณากรอกข้อมูลให้ครบถ้วน', 400);
    }
  }

  $fullname = Security::sanitize($input['fullname']);
  $email = Security::sanitize($input['email']);
  $student_id = Security::sanitize($input['student_id']);
  $password = $input['password'];
  $role = isset($input['role']) ? Security::sanitize($input['role']) : 'user';
  if ($role === 'student') { $role = 'user'; }
  if ($role === 'teacher') { $role = 'staff'; }

  if (strlen($fullname) < 2) {
    Response::error('ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร', 400);
  }
  if (!Security::validateEmail($email)) {
    Response::error('รูปแบบอีเมลไม่ถูกต้อง (รหัส 12 หลัก + -st@rmutsb.ac.th)', 400);
  }
  if (!Security::validateStudentId($student_id)) {
    Response::error('รูปแบบรหัสนักศึกษาไม่ถูกต้อง (รหัส 12 หลัก)', 400);
  }
  if (strlen($password) < 6) {
    Response::error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 400);
  }
  $email_sid = substr($email, 0, 12);
  if ($email_sid !== $student_id) {
    Response::error('รหัสนักศึกษาในอีเมลไม่ตรงกับรหัสนักศึกษาที่กรอก', 400);
  }

  // prevent duplicates against existing users
  $check = $conn->prepare('SELECT id FROM users WHERE email = :email OR student_id = :sid LIMIT 1');
  $check->bindParam(':email', $email, PDO::PARAM_STR);
  $check->bindParam(':sid', $student_id, PDO::PARAM_STR);
  $check->execute();
  if ($check->fetch()) {
    Response::error('อีเมลหรือรหัสนักศึกษามีผู้ใช้งานแล้ว', 409);
  }

  // prevent duplicates in pending
  $check2 = $conn->prepare('SELECT id FROM pending_registrations WHERE email = :email OR student_id = :sid LIMIT 1');
  $check2->bindParam(':email', $email, PDO::PARAM_STR);
  $check2->bindParam(':sid', $student_id, PDO::PARAM_STR);
  $check2->execute();
  if ($check2->fetch()) {
    Response::error('มีคำขอนี้อยู่แล้ว กรุณารอการอนุมัติ', 409);
  }

  $hash = Security::hashPassword($password);
  $ins = $conn->prepare('INSERT INTO pending_registrations (fullname, email, student_id, password_hash, role) VALUES (:fullname, :email, :sid, :pwd, :role)');
  $ins->bindParam(':fullname', $fullname, PDO::PARAM_STR);
  $ins->bindParam(':email', $email, PDO::PARAM_STR);
  $ins->bindParam(':sid', $student_id, PDO::PARAM_STR);
  $ins->bindParam(':pwd', $hash, PDO::PARAM_STR);
  $ins->bindParam(':role', $role, PDO::PARAM_STR);
  if (!$ins->execute()) {
    Response::error('ไม่สามารถบันทึกคำขอได้', 500);
  }

  Response::success('ส่งคำขอสมัครสำเร็จ');
}

function updatePending(PDO $conn, array $input) {
  if (!isset($input['id']) || !is_numeric($input['id'])) {
    Response::error('ต้องระบุ ID', 400);
  }
  $id = (int)$input['id'];
  $action = isset($input['action']) ? $input['action'] : '';

  $sel = $conn->prepare('SELECT * FROM pending_registrations WHERE id = :id');
  $sel->bindParam(':id', $id, PDO::PARAM_INT);
  $sel->execute();
  $req = $sel->fetch(PDO::FETCH_ASSOC);
  if (!$req) {
    Response::error('ไม่พบคำขอ', 404);
  }

  if ($action === 'approve') {
    // create user
    $ins = $conn->prepare('INSERT INTO users (student_id, email, fullname, password, role, status) VALUES (:sid, :email, :fullname, :pwd, :role, :status)');
    $status = 'active';
    $ins->bindParam(':sid', $req['student_id'], PDO::PARAM_STR);
    $ins->bindParam(':email', $req['email'], PDO::PARAM_STR);
    $ins->bindParam(':fullname', $req['fullname'], PDO::PARAM_STR);
    $ins->bindParam(':pwd', $req['password_hash'], PDO::PARAM_STR);
    $ins->bindParam(':role', $req['role'], PDO::PARAM_STR);
    $ins->bindParam(':status', $status, PDO::PARAM_STR);
    if (!$ins->execute()) {
      Response::error('ไม่สามารถอนุมัติได้', 500);
    }
    $upd = $conn->prepare("UPDATE pending_registrations SET status = 'approved', reviewed_at = NOW() WHERE id = :id");
    $upd->bindParam(':id', $id, PDO::PARAM_INT);
    $upd->execute();
    // cleanup optional: delete
    $del = $conn->prepare('DELETE FROM pending_registrations WHERE id = :id');
    $del->bindParam(':id', $id, PDO::PARAM_INT);
    $del->execute();
    Response::success('อนุมัติคำขอสำเร็จ');
  } elseif ($action === 'reject') {
    // ลบคำขอออกจากฐานข้อมูลเลย ไม่ต้องเก็บไว้
    $del = $conn->prepare('DELETE FROM pending_registrations WHERE id = :id');
    $del->bindParam(':id', $id, PDO::PARAM_INT);
    if (!$del->execute()) {
      Response::error('ไม่สามารถปฏิเสธได้', 500);
    }
    Response::success('ปฏิเสธคำขอสำเร็จ');
  } else {
    Response::error('ต้องระบุ action เป็น approve หรือ reject', 400);
  }
}

function deletePending(PDO $conn, array $input) {
  if (!isset($input['id']) || !is_numeric($input['id'])) {
    Response::error('ต้องระบุ ID', 400);
  }
  $id = (int)$input['id'];
  $del = $conn->prepare('DELETE FROM pending_registrations WHERE id = :id');
  $del->bindParam(':id', $id, PDO::PARAM_INT);
  if (!$del->execute()) {
    Response::error('ลบไม่สำเร็จ', 500);
  }
  Response::success('ลบรายการสำเร็จ');
}

?>


