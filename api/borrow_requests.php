<?php
require_once __DIR__ . '/../Connect.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $db = new Database();
    $conn = $db->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    switch ($method) {
        case 'GET':
            listBorrowRequests($conn);
            break;
        case 'POST':
            createBorrowRequest($conn, $input);
            break;
        case 'PUT':
            updateBorrowRequest($conn, $input);
            break;
        case 'DELETE':
            deleteBorrowRequest($conn, $input);
            break;
        default:
            Response::error('Method not allowed', 405);
    }
} catch (Throwable $e) {
    error_log("Borrow Request API error: " . $e->getMessage());
    Response::error('Server error', 500);
}

function listBorrowRequests($conn) {
    $stmt = $conn->prepare('
        SELECT 
            br.id,
            br.user_id,
            u.fullname,
            u.student_id,
            br.request_date,
            br.borrow_date,
            br.return_date,
            br.status,
            br.approver_id,
            br.approver_name,
            br.notes,
            br.created_at,
            br.updated_at
        FROM borrow_requests br
        JOIN users u ON br.user_id = u.id
        ORDER BY br.created_at DESC
    ');
    $stmt->execute();
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($requests as &$request) {
        $itemsStmt = $conn->prepare('
            SELECT 
                bri.id,
                bri.equipment_id,
                e.name as equipment_name,
                e.category,
                bri.quantity_requested,
                bri.quantity_approved
            FROM borrow_request_items bri
            JOIN equipment e ON bri.equipment_id = e.id
            WHERE bri.request_id = ?
        ');
        $itemsStmt->execute([$request['id']]);
        $request['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    Response::success('ดึงข้อมูลคำขอยืมสำเร็จ', ['requests' => $requests]);
}

function createBorrowRequest($conn, $input) {
    if (!isset($input['user_id']) || !isset($input['borrow_date']) || !isset($input['return_date']) || !isset($input['items'])) {
        Response::error('ข้อมูลไม่ครบถ้วน', 400);
    }

    $conn->beginTransaction();
    
    try {
        // Create borrow request
        $requestId = dbInsertAndGetId(
            $conn,
            '
            INSERT INTO borrow_requests (user_id, borrow_date, return_date, notes) 
            VALUES (?, ?, ?, ?)
            ',
            [
                $input['user_id'],
                $input['borrow_date'],
                $input['return_date'],
                $input['notes'] ?? null
            ]
        );
        
        // Create request items
        foreach ($input['items'] as $item) {
            $itemStmt = $conn->prepare('
                INSERT INTO borrow_request_items (request_id, equipment_id, quantity_requested) 
                VALUES (?, ?, ?)
            ');
            $itemStmt->execute([
                $requestId,
                $item['equipment_id'],
                $item['quantity']
            ]);
        }
        
        $conn->commit();
        
        // Get created request with details
        $stmt = $conn->prepare('
            SELECT 
                br.id,
                br.user_id,
                u.fullname,
                u.student_id,
                br.request_date,
                br.borrow_date,
                br.return_date,
                br.status,
                br.notes,
                br.created_at
            FROM borrow_requests br
            JOIN users u ON br.user_id = u.id
            WHERE br.id = ?
        ');
        $stmt->execute([$requestId]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);
        
        Response::success('ส่งคำขอยืมสำเร็จ', ['request' => $request], 201);
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
}

function updateBorrowRequest($conn, $input) {
    if (!isset($input['id']) || !is_numeric($input['id'])) {
        Response::error('ต้องระบุ ID คำขอ', 400);
    }
    
    $id = (int)$input['id'];
    $action = isset($input['action']) ? $input['action'] : '';
    
    // Handle approve action
    if ($action === 'approve') {
        $approver_id = isset($input['approver_id']) ? (int)$input['approver_id'] : null;
        
        // Get approver name
        $approver_name = 'ไม่ระบุ';
        if ($approver_id) {
            $stmt = $conn->prepare('SELECT fullname FROM users WHERE id = ?');
            $stmt->execute([$approver_id]);
            $approver = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($approver) {
                $approver_name = $approver['fullname'];
            }
        }
        
        // Start transaction for approve process
        $conn->beginTransaction();
        
        try {
            // Get request details
            $requestStmt = $conn->prepare('SELECT * FROM borrow_requests WHERE id = ?');
            $requestStmt->execute([$id]);
            $request = $requestStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$request) {
                throw new Exception('ไม่พบคำขอยืม');
            }
            
            // Get request items
            $itemsStmt = $conn->prepare('SELECT * FROM borrow_request_items WHERE request_id = ?');
            $itemsStmt->execute([$id]);
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Check equipment availability and create borrowing records
            foreach ($items as $item) {
                // Check if equipment has enough quantity
                $equipmentStmt = $conn->prepare('SELECT quantity_available FROM equipment WHERE id = ?');
                $equipmentStmt->execute([$item['equipment_id']]);
                $equipment = $equipmentStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$equipment || $equipment['quantity_available'] < $item['quantity_requested']) {
                    throw new Exception('อุปกรณ์ ID ' . $item['equipment_id'] . ' ไม่เพียงพอ');
                }
                
                // Create borrowing record for each item
                for ($i = 0; $i < $item['quantity_requested']; $i++) {
                    $borrowingStmt = $conn->prepare('
                        INSERT INTO borrowing (user_id, equipment_id, borrow_date, due_date, notes) 
                        VALUES (?, ?, ?, ?, ?)
                    ');
                    $borrowingStmt->execute([
                        $request['user_id'],
                        $item['equipment_id'],
                        $request['borrow_date'],
                        $request['return_date'],
                        'อนุมัติโดย: ' . $approver_name
                    ]);
                    
                    $borrowingId = dbLastInsertId($conn, 'borrowing');
                    
                    // Create borrowing history record
                    $historyStmt = $conn->prepare('
                        INSERT INTO borrowing_history (borrowing_id, user_id, equipment_id, action, action_date, notes, approver_id, approver_name) 
                        VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)
                    ');
                    $historyStmt->execute([
                        $borrowingId,
                        $request['user_id'],
                        $item['equipment_id'],
                        'borrow',
                        'อนุมัติโดย: ' . $approver_name,
                        $approver_id,
                        $approver_name
                    ]);
                    
                    // Update equipment quantity
                    $updateEquipmentStmt = $conn->prepare('
                        UPDATE equipment 
                        SET quantity_available = quantity_available - 1,
                            status = CASE 
                                WHEN quantity_available - 1 <= 0 THEN \'unavailable\'
                                WHEN quantity_available - 1 <= 5 THEN \'limited\'
                                ELSE status
                            END
                        WHERE id = ?
                    ');
                    $updateEquipmentStmt->execute([$item['equipment_id']]);
                }
                
                // Update approved quantity
                $updateItemStmt = $conn->prepare('
                    UPDATE borrow_request_items 
                    SET quantity_approved = quantity_requested 
                    WHERE id = ?
                ');
                $updateItemStmt->execute([$item['id']]);
            }
            
            // Update request status
            $upd = $conn->prepare('UPDATE borrow_requests SET status = :status, approver_id = :approver_id, approver_name = :approver_name, approved_at = NOW() WHERE id = :id');
            $status = 'approved';
            $upd->bindParam(':status', $status, PDO::PARAM_STR);
            $upd->bindParam(':approver_id', $approver_id, PDO::PARAM_INT);
            $upd->bindParam(':approver_name', $approver_name, PDO::PARAM_STR);
            $upd->bindParam(':id', $id, PDO::PARAM_INT);
            
            if (!$upd->execute()) {
                throw new Exception('ไม่สามารถอัปเดตสถานะคำขอได้');
            }
            
            $conn->commit();
            Response::success('อนุมัติคำขอสำเร็จ');
            
        } catch (Exception $e) {
            $conn->rollBack();
            Response::error('ไม่สามารถอนุมัติคำขอได้: ' . $e->getMessage(), 500);
        }
        return;
    }
    
    // Handle reject action
    if ($action === 'reject') {
        $notes = isset($input['notes']) ? Security::sanitize($input['notes']) : 'ถูกปฏิเสธ';
        
        $upd = $conn->prepare('UPDATE borrow_requests SET status = :status, notes = :notes WHERE id = :id');
        $status = 'rejected';
        $upd->bindParam(':status', $status, PDO::PARAM_STR);
        $upd->bindParam(':notes', $notes, PDO::PARAM_STR);
        $upd->bindParam(':id', $id, PDO::PARAM_INT);
        
        if (!$upd->execute()) {
            Response::error('ไม่สามารถปฏิเสธคำขอได้', 500);
        }
        
        Response::success('ปฏิเสธคำขอสำเร็จ');
        return;
    }
    
    $stmt = $conn->prepare('SELECT id FROM borrow_requests WHERE id = ?');
    $stmt->bindParam(1, $id, PDO::PARAM_INT);
    $stmt->execute();
    if (!$stmt->fetch()) {
        Response::error('ไม่พบคำขอยืม', 404);
    }
    
    $fields = [];
    $params = [':id' => $id];
    
    $map = [
        'status' => PDO::PARAM_STR,
        'notes' => PDO::PARAM_STR,
        'borrow_date' => PDO::PARAM_STR,
        'return_date' => PDO::PARAM_STR,
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
    
    $sql = 'UPDATE borrow_requests SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $upd = $conn->prepare($sql);
    foreach ($params as $k => $v) {
        $type = is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR;
        $upd->bindValue($k, $v, $type);
    }
    
    if (!$upd->execute()) {
        Response::error('ไม่สามารถแก้ไขคำขอได้', 500);
    }
    
    $sel = $conn->prepare('SELECT id, status, notes, borrow_date, return_date, updated_at FROM borrow_requests WHERE id = :id');
    $sel->bindParam(':id', $id, PDO::PARAM_INT);
    $sel->execute();
    $row = $sel->fetch(PDO::FETCH_ASSOC);
    Response::success('แก้ไขคำขอสำเร็จ', ['request' => $row]);
}

function deleteBorrowRequest($conn, $input) {
    if (!isset($input['id']) || !is_numeric($input['id'])) {
        Response::error('ต้องระบุ ID คำขอ', 400);
    }
    
    $id = (int)$input['id'];
    
    $stmt = $conn->prepare('SELECT id FROM borrow_requests WHERE id = ?');
    $stmt->bindParam(1, $id, PDO::PARAM_INT);
    $stmt->execute();
    if (!$stmt->fetch()) {
        Response::error('ไม่พบคำขอยืม', 404);
    }
    
    $del = $conn->prepare('DELETE FROM borrow_requests WHERE id = ?');
    $del->bindParam(1, $id, PDO::PARAM_INT);
    if (!$del->execute()) {
        Response::error('ไม่สามารถลบคำขอได้', 500);
    }
    
    Response::success('ลบคำขอสำเร็จ');
}
?>
