<?php
/**
 * ===================================================
 * 📧 Mailer - ส่ง Email แจ้งเตือนผู้ใช้
 * ===================================================
 * ใช้ PHPMailer ส่งผ่าน SMTP
 */

require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class Mailer
{
    /**
     * สร้าง PHPMailer instance ที่ตั้งค่า SMTP แล้ว
     */
    private static function createMailer(): PHPMailer
    {
        $mail = new PHPMailer(true);

        // SMTP settings
        $mail->isSMTP();
        $mail->Host       = defined('MAIL_HOST') ? MAIL_HOST : 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = defined('MAIL_USERNAME') ? MAIL_USERNAME : '';
        $mail->Password   = defined('MAIL_PASSWORD') ? MAIL_PASSWORD : '';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = defined('MAIL_PORT') ? MAIL_PORT : 587;
        $mail->CharSet    = 'UTF-8';

        // Sender
        $fromEmail = defined('MAIL_FROM') ? MAIL_FROM : $mail->Username;
        $fromName  = defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : 'ระบบยืม-คืนอุปกรณ์ IoT';
        $mail->setFrom($fromEmail, $fromName);

        $mail->isHTML(true);

        return $mail;
    }

    /**
     * ส่ง Email แจ้งเตือนเมื่อคำขอยืมถูกอนุมัติ
     *
     * @param PDO   $conn          DB connection
     * @param array $request       ข้อมูลคำขอยืม (จาก borrow_requests)
     * @param array $items         รายการอุปกรณ์ (จาก borrow_request_items)
     * @param string $approverName ชื่อผู้อนุมัติ
     */
    public static function sendApprovalNotification(PDO $conn, array $request, array $items, string $approverName): void
    {
        try {
            // ดึง email ผู้ใช้
            $userStmt = $conn->prepare('SELECT fullname, email FROM users WHERE id = ?');
            $userStmt->execute([$request['user_id']]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (!$user || empty($user['email'])) {
                error_log("Mailer: ไม่พบ email ของ user_id = " . $request['user_id']);
                return;
            }

            // ดึงชื่ออุปกรณ์
            $equipmentList = [];
            foreach ($items as $item) {
                $eqStmt = $conn->prepare('SELECT name FROM equipment WHERE id = ?');
                $eqStmt->execute([$item['equipment_id']]);
                $eq = $eqStmt->fetch(PDO::FETCH_ASSOC);
                $equipmentList[] = [
                    'name'     => $eq ? $eq['name'] : 'อุปกรณ์ #' . $item['equipment_id'],
                    'quantity' => $item['quantity_requested'],
                ];
            }

            $mail = self::createMailer();
            $mail->addAddress($user['email'], $user['fullname']);
            $mail->Subject = '✅ คำขอยืมอุปกรณ์ได้รับการอนุมัติแล้ว';
            $mail->Body    = self::buildApprovalEmailBody(
                $user['fullname'],
                $equipmentList,
                $request['borrow_date'],
                $request['return_date'],
                $approverName
            );

            $mail->send();
            error_log("Mailer: ส่ง email อนุมัติถึง " . $user['email'] . " สำเร็จ");
        } catch (Exception $e) {
            error_log("Mailer: ส่ง email อนุมัติไม่สำเร็จ - " . $e->getMessage());
        }
    }

    /**
     * ส่ง Email แจ้งเตือนเมื่อคำขอยืมถูกปฏิเสธ
     *
     * @param PDO    $conn  DB connection
     * @param int    $id    ID ของคำขอยืม
     * @param string $notes เหตุผลในการปฏิเสธ
     */
    public static function sendRejectionNotification(PDO $conn, int $id, string $notes): void
    {
        try {
            // ดึงข้อมูลคำขอ + ผู้ใช้
            $stmt = $conn->prepare('
                SELECT br.*, u.fullname, u.email 
                FROM borrow_requests br 
                JOIN users u ON br.user_id = u.id 
                WHERE br.id = ?
            ');
            $stmt->execute([$id]);
            $request = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$request || empty($request['email'])) {
                error_log("Mailer: ไม่พบ email ของคำขอ ID = " . $id);
                return;
            }

            // ดึงรายการอุปกรณ์
            $itemsStmt = $conn->prepare('
                SELECT bri.quantity_requested, e.name 
                FROM borrow_request_items bri 
                JOIN equipment e ON bri.equipment_id = e.id 
                WHERE bri.request_id = ?
            ');
            $itemsStmt->execute([$id]);
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

            $equipmentList = [];
            foreach ($items as $item) {
                $equipmentList[] = [
                    'name'     => $item['name'],
                    'quantity' => $item['quantity_requested'],
                ];
            }

            $mail = self::createMailer();
            $mail->addAddress($request['email'], $request['fullname']);
            $mail->Subject = '❌ คำขอยืมอุปกรณ์ถูกปฏิเสธ';
            $mail->Body    = self::buildRejectionEmailBody(
                $request['fullname'],
                $equipmentList,
                $request['borrow_date'],
                $request['return_date'],
                $notes
            );

            $mail->send();
            error_log("Mailer: ส่ง email ปฏิเสธถึง " . $request['email'] . " สำเร็จ");
        } catch (Exception $e) {
            error_log("Mailer: ส่ง email ปฏิเสธไม่สำเร็จ - " . $e->getMessage());
        }
    }

    // =========================================================
    // HTML Email Templates
    // =========================================================

    /**
     * สร้าง HTML สำหรับ email อนุมัติ
     */
    private static function buildApprovalEmailBody(
        string $fullname,
        array  $equipmentList,
        string $borrowDate,
        string $returnDate,
        string $approverName
    ): string {
        $itemsHtml = '';
        foreach ($equipmentList as $item) {
            $itemsHtml .= '<tr>
                <td style="padding:10px 14px; border-bottom:1px solid #e8f5e9; font-size:14px;">' . htmlspecialchars($item['name']) . '</td>
                <td style="padding:10px 14px; border-bottom:1px solid #e8f5e9; font-size:14px; text-align:center;">' . (int)$item['quantity'] . '</td>
            </tr>';
        }

        return '
        <!DOCTYPE html>
        <html lang="th">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0; padding:0; background-color:#f0f4f8; font-family:\'Noto Sans Thai\', Tahoma, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8; padding:30px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #43a047, #66bb6a); padding:30px; text-align:center;">
                                    <div style="font-size:48px; margin-bottom:8px;">✅</div>
                                    <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600;">คำขอยืมอุปกรณ์ได้รับการอนุมัติ</h1>
                                </td>
                            </tr>
                            <!-- Body -->
                            <tr>
                                <td style="padding:30px;">
                                    <p style="font-size:15px; color:#333; margin:0 0 20px;">
                                        สวัสดีคุณ <strong>' . htmlspecialchars($fullname) . '</strong>,
                                    </p>
                                    <p style="font-size:14px; color:#555; margin:0 0 20px;">
                                        คำขอยืมอุปกรณ์ของคุณได้รับการ <span style="color:#43a047; font-weight:600;">อนุมัติ</span> แล้ว รายละเอียดดังนี้:
                                    </p>

                                    <!-- Equipment Table -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0; border-radius:8px; overflow:hidden; margin-bottom:20px;">
                                        <thead>
                                            <tr style="background-color:#e8f5e9;">
                                                <th style="padding:12px 14px; text-align:left; font-size:13px; color:#2e7d32; font-weight:600;">อุปกรณ์</th>
                                                <th style="padding:12px 14px; text-align:center; font-size:13px; color:#2e7d32; font-weight:600;">จำนวน</th>
                                            </tr>
                                        </thead>
                                        <tbody>' . $itemsHtml . '</tbody>
                                    </table>

                                    <!-- Info Box -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f8e9; border-radius:8px; margin-bottom:20px;">
                                        <tr>
                                            <td style="padding:16px;">
                                                <p style="margin:0 0 8px; font-size:13px; color:#555;">📅 <strong>วันที่ยืม:</strong> ' . htmlspecialchars($borrowDate) . '</p>
                                                <p style="margin:0 0 8px; font-size:13px; color:#555;">📅 <strong>วันที่คืน:</strong> ' . htmlspecialchars($returnDate) . '</p>
                                                <p style="margin:0; font-size:13px; color:#555;">👤 <strong>อนุมัติโดย:</strong> ' . htmlspecialchars($approverName) . '</p>
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="font-size:13px; color:#888; margin:0;">
                                        กรุณามารับอุปกรณ์ตามวันที่กำหนด และคืนอุปกรณ์ตามกำหนดเวลา
                                    </p>
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="background-color:#fafafa; padding:20px; text-align:center; border-top:1px solid #eee;">
                                    <p style="margin:0; font-size:12px; color:#aaa;">ระบบบริการยืม-คืนอุปกรณ์วิชา IoT</p>
                                    <p style="margin:4px 0 0; font-size:11px; color:#ccc;">Email นี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>';
    }

    /**
     * สร้าง HTML สำหรับ email ปฏิเสธ
     */
    private static function buildRejectionEmailBody(
        string $fullname,
        array  $equipmentList,
        string $borrowDate,
        string $returnDate,
        string $notes
    ): string {
        $itemsHtml = '';
        foreach ($equipmentList as $item) {
            $itemsHtml .= '<tr>
                <td style="padding:10px 14px; border-bottom:1px solid #ffebee; font-size:14px;">' . htmlspecialchars($item['name']) . '</td>
                <td style="padding:10px 14px; border-bottom:1px solid #ffebee; font-size:14px; text-align:center;">' . (int)$item['quantity'] . '</td>
            </tr>';
        }

        return '
        <!DOCTYPE html>
        <html lang="th">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0; padding:0; background-color:#f0f4f8; font-family:\'Noto Sans Thai\', Tahoma, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8; padding:30px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #e53935, #ef5350); padding:30px; text-align:center;">
                                    <div style="font-size:48px; margin-bottom:8px;">❌</div>
                                    <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600;">คำขอยืมอุปกรณ์ถูกปฏิเสธ</h1>
                                </td>
                            </tr>
                            <!-- Body -->
                            <tr>
                                <td style="padding:30px;">
                                    <p style="font-size:15px; color:#333; margin:0 0 20px;">
                                        สวัสดีคุณ <strong>' . htmlspecialchars($fullname) . '</strong>,
                                    </p>
                                    <p style="font-size:14px; color:#555; margin:0 0 20px;">
                                        ขออภัย คำขอยืมอุปกรณ์ของคุณ <span style="color:#e53935; font-weight:600;">ถูกปฏิเสธ</span> รายละเอียดดังนี้:
                                    </p>

                                    <!-- Equipment Table -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0; border-radius:8px; overflow:hidden; margin-bottom:20px;">
                                        <thead>
                                            <tr style="background-color:#ffebee;">
                                                <th style="padding:12px 14px; text-align:left; font-size:13px; color:#c62828; font-weight:600;">อุปกรณ์</th>
                                                <th style="padding:12px 14px; text-align:center; font-size:13px; color:#c62828; font-weight:600;">จำนวน</th>
                                            </tr>
                                        </thead>
                                        <tbody>' . $itemsHtml . '</tbody>
                                    </table>

                                    <!-- Info Box -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff3e0; border-radius:8px; margin-bottom:20px;">
                                        <tr>
                                            <td style="padding:16px;">
                                                <p style="margin:0 0 8px; font-size:13px; color:#555;">📅 <strong>วันที่ยืม:</strong> ' . htmlspecialchars($borrowDate) . '</p>
                                                <p style="margin:0 0 8px; font-size:13px; color:#555;">📅 <strong>วันที่คืน:</strong> ' . htmlspecialchars($returnDate) . '</p>
                                                <p style="margin:0; font-size:13px; color:#555;">📝 <strong>เหตุผล:</strong> ' . htmlspecialchars($notes) . '</p>
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="font-size:13px; color:#888; margin:0;">
                                        หากมีข้อสงสัย กรุณาติดต่ออาจารย์ผู้ดูแลรายวิชา
                                    </p>
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="background-color:#fafafa; padding:20px; text-align:center; border-top:1px solid #eee;">
                                    <p style="margin:0; font-size:12px; color:#aaa;">ระบบบริการยืม-คืนอุปกรณ์วิชา IoT</p>
                                    <p style="margin:4px 0 0; font-size:11px; color:#ccc;">Email นี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>';
    }
}
