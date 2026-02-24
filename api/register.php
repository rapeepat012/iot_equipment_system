<?php
/**
 * API สำหรับระบบ Register
 * Register API for IoT Equipment Borrowing System
 */

require_once __DIR__ . '/../Connect.php';

// ตั้งค่า CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// จัดการ OPTIONS Request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ตรวจสอบว่าเป็น POST Request หรือไม่
if (!Input::isPost()) {
    Response::error('ต้องใช้ POST Request เท่านั้น', 405);
}

try {
    // ดึงข้อมูลจาก Request Body
    $input = Input::json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    $required_fields = ['fullname', 'email', 'student_id', 'password', 'confirm_password'];
    $missing_fields = [];
    
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            $missing_fields[] = $field;
        }
    }
    
    if (!empty($missing_fields)) {
        Response::error('กรุณากรอกข้อมูลให้ครบถ้วน: ' . implode(', ', $missing_fields), 400);
    }
    
    // ดึงข้อมูล
    $fullname = Security::sanitize($input['fullname']);
    $email = Security::sanitize($input['email']);
    $student_id = Security::sanitize($input['student_id']);
    $password = $input['password'];
    $confirm_password = $input['confirm_password'];
    
    // ตรวจสอบความยาวชื่อ-นามสกุล
    if (strlen($fullname) < 2) {
        Response::error('ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร', 400);
    }
    
    // ตรวจสอบรูปแบบอีเมล
    if (!Security::validateEmail($email)) {
        Response::error('รูปแบบอีเมลไม่ถูกต้อง (รหัส 12 หลัก + -st@rmutsb.ac.th)', 400);
    }
    
    // ตรวจสอบรูปแบบรหัสนักศึกษา
    if (!Security::validateStudentId($student_id)) {
        Response::error('รูปแบบรหัสนักศึกษาไม่ถูกต้อง (รหัส 12 หลัก)', 400);
    }
    
    // ตรวจสอบความยาวรหัสผ่าน
    if (strlen($password) < 6) {
        Response::error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 400);
    }
    
    // ตรวจสอบรหัสผ่านตรงกัน
    if ($password !== $confirm_password) {
        Response::error('รหัสผ่านไม่ตรงกัน', 400);
    }
    
    // ตรวจสอบว่ารหัสนักศึกษาในอีเมลตรงกับรหัสนักศึกษาที่กรอก
    $email_student_id = substr($email, 0, 12); // 12 หลัก
    if ($email_student_id !== $student_id) {
        Response::error('รหัสนักศึกษาในอีเมลไม่ตรงกับรหัสนักศึกษาที่กรอก', 400);
    }
    
    // เชื่อมต่อฐานข้อมูล
    $database = new Database();
    $conn = $database->getConnection();
    
    // ตรวจสอบว่ารหัสนักศึกษาซ้ำหรือไม่
    $check_student_query = "SELECT id FROM users WHERE student_id = :student_id";
    $check_student_stmt = $conn->prepare($check_student_query);
    $check_student_stmt->bindParam(':student_id', $student_id, PDO::PARAM_STR);
    $check_student_stmt->execute();
    
    if ($check_student_stmt->fetch()) {
        Response::error('รหัสนักศึกษานี้มีผู้ใช้งานแล้ว', 409);
    }
    
    // ตรวจสอบว่าอีเมลซ้ำหรือไม่
    $check_email_query = "SELECT id FROM users WHERE email = :email";
    $check_email_stmt = $conn->prepare($check_email_query);
    $check_email_stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $check_email_stmt->execute();
    
    if ($check_email_stmt->fetch()) {
    // ตรวจสอบว่ารหัสนักศึกษาหรืออีเมลซ้ำหรือไม่ (รวมเป็น Query เดียว)
    $check_query = "SELECT id FROM users WHERE student_id = :student_id OR email = :email LIMIT 1";
    $check_stmt = $conn->prepare($check_query);
    $check_stmt->bindParam(':student_id', $student_id, PDO::PARAM_STR);
    $check_stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $check_stmt->execute();
    if ($check_stmt->fetch()) {
        Response::error('อีเมลนี้มีผู้ใช้งานแล้ว', 409);
    }
}
    
    // Hash รหัสผ่าน
    $hashed_password = Security::hashPassword($password);
    
    // เพิ่มผู้ใช้ใหม่ (กำหนดบทบาทเริ่มต้นเป็น user)
    $insert_query = "INSERT INTO users (student_id, email, fullname, password, role, status) 
                     VALUES (:student_id, :email, :fullname, :password, 'user', 'active')";
    
    $insert_stmt = $conn->prepare($insert_query);
    $insert_stmt->bindParam(':student_id', $student_id, PDO::PARAM_STR);
    $insert_stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $insert_stmt->bindParam(':fullname', $fullname, PDO::PARAM_STR);
    $insert_stmt->bindParam(':password', $hashed_password, PDO::PARAM_STR);
    
    if (!$insert_stmt->execute()) {
        Response::error('ไม่สามารถสร้างบัญชีได้', 500);
    }
    
    $user_id = dbLastInsertId($conn, 'users');
    
    // ดึงข้อมูลผู้ใช้ที่สร้างใหม่
    $select_query = "SELECT id, student_id, email, fullname, role, status, created_at 
                     FROM users WHERE id = :user_id";
    $select_stmt = $conn->prepare($select_query);
    $select_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $select_stmt->execute();
    
    $new_user = $select_stmt->fetch(PDO::FETCH_ASSOC);
    
    // สร้างข้อมูลตอบกลับ
    $response_data = [
        'user' => [
            'id' => $new_user['id'],
            'student_id' => $new_user['student_id'],
            'email' => $new_user['email'],
            'fullname' => $new_user['fullname'],
            'role' => $new_user['role'],
            'status' => $new_user['status'],
            'created_at' => $new_user['created_at'], 
        ],
        'message' => 'สมัครสมาชิกสำเร็จ คุณสามารถเข้าสู่ระบบได้แล้ว'
    ];
    
    
    Response::success('สมัครสมาชิกสำเร็จ', $response_data, 201);

    
} catch (Exception $e) {
    error_log("Register error: " . $e->getMessage());
    Response::error('เกิดข้อผิดพลาดในระบบ', 500);
} finally {
    if (isset($database)) {
        $database->closeConnection();
    }
}


?>
