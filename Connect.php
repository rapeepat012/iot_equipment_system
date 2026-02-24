<?php
// Load local config if available.
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

class Database {
    private $driver;
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    private $sslmode;
    private $charset = 'utf8mb4';
    private $conn;

    public function __construct() {
        $this->driver = strtolower((string)(getenv('DB_DRIVER') ?: 'mysql'));

        if (defined('DB_HOST')) {
            $this->driver = defined('DB_DRIVER') ? strtolower((string)DB_DRIVER) : $this->driver;
            $this->host = DB_HOST;
            $this->db_name = DB_NAME;
            $this->username = DB_USER;
            $this->password = DB_PASS;
            $this->port = defined('DB_PORT') ? DB_PORT : '3306';
            $this->sslmode = defined('DB_SSLMODE') ? DB_SSLMODE : 'prefer';
        } else {
            $this->host = getenv('DB_HOST') ?: 'localhost';
            $this->db_name = getenv('DB_NAME') ?: 'iot_equipment_system';
            $this->username = getenv('DB_USER') ?: 'root';
            $this->password = getenv('DB_PASS') ?: '';
            $this->port = getenv('DB_PORT') ?: '3306';
            $this->sslmode = getenv('DB_SSLMODE') ?: 'prefer';
        }

        if ($this->driver === 'postgres' || $this->driver === 'postgresql') {
            $this->driver = 'pgsql';
        }
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            if ($this->driver === 'pgsql') {
                $dsn = "pgsql:host={$this->host};port={$this->port};dbname={$this->db_name};sslmode={$this->sslmode}";
                // Supabase pooler (port 6543) is safest with emulated prepares.
                $options[PDO::ATTR_EMULATE_PREPARES] = true;
            } else {
                $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset={$this->charset}";
                $options[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci";
            }

            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            $errorMsg = "ไม่สามารถเชื่อมต่อฐานข้อมูลได้";
            $errorDetails = $exception->getMessage();

            if (strpos($errorDetails, 'Access denied') !== false) {
                $errorMsg .= " - Username หรือ Password ไม่ถูกต้อง";
            } elseif (strpos($errorDetails, 'Unknown database') !== false || strpos($errorDetails, 'does not exist') !== false) {
                $errorMsg .= " - Database '" . $this->db_name . "' ไม่พบ";
            } elseif (strpos($errorDetails, 'Connection refused') !== false || strpos($errorDetails, 'could not connect') !== false) {
                $errorMsg .= " - ไม่สามารถเชื่อมต่อกับ host: " . $this->host;
            }

            throw new Exception($errorMsg . " (Details: " . $errorDetails . ")");
        }

        return $this->conn;
    }

    public function closeConnection() {
        $this->conn = null;
    }

    public function getDriver() {
        return $this->driver;
    }

    public function testConnection() {
        try {
            $conn = $this->getConnection();
            if ($conn) {
                return [
                    'status' => 'success',
                    'message' => 'เชื่อมต่อฐานข้อมูลสำเร็จ',
                    'database' => $this->db_name,
                    'host' => $this->host,
                    'port' => $this->port,
                    'driver' => $this->driver,
                ];
            }
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }
}

if (!function_exists('dbInsertAndGetId')) {
    function dbInsertAndGetId(PDO $conn, string $insertSql, array $params = []): int {
        $driver = $conn->getAttribute(PDO::ATTR_DRIVER_NAME);
        $sql = rtrim($insertSql);
        if (substr($sql, -1) === ';') {
            $sql = rtrim(substr($sql, 0, -1));
        }

        if ($driver === 'pgsql') {
            $stmt = $conn->prepare($sql . ' RETURNING id');
            $stmt->execute($params);
            $id = $stmt->fetchColumn();
        } else {
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            $id = $conn->lastInsertId();
        }

        if ($id === false || $id === null || $id === '') {
            throw new Exception('Unable to determine inserted row id');
        }

        return (int)$id;
    }
}

if (!function_exists('dbLastInsertId')) {
    function dbLastInsertId(PDO $conn, string $table = '', string $column = 'id'): int {
        $id = $conn->lastInsertId();
        $driver = $conn->getAttribute(PDO::ATTR_DRIVER_NAME);

        if (($id === false || $id === null || $id === '' || $id === '0') && $driver === 'pgsql' && $table !== '') {
            if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $table)) {
                throw new Exception('Invalid table name for dbLastInsertId');
            }
            if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $column)) {
                throw new Exception('Invalid column name for dbLastInsertId');
            }

            $stmt = $conn->query("SELECT currval(pg_get_serial_sequence('{$table}', '{$column}'))");
            $id = $stmt ? $stmt->fetchColumn() : null;
        }

        if ($id === false || $id === null || $id === '') {
            throw new Exception('Unable to determine inserted row id');
        }

        return (int)$id;
    }
}

class Response {
    public static function json($data, $status_code = 200) {
        http_response_code($status_code);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success($message, $data = null, $status_code = 200) {
        $response = [
            'success' => true,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s'),
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        self::json($response, $status_code);
    }

    public static function error($message, $status_code = 400, $errors = null) {
        $response = [
            'success' => false,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s'),
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        self::json($response, $status_code);
    }
}

class Input {
    public static function post($key = null, $default = null) {
        if ($key === null) {
            return $_POST;
        }
        return isset($_POST[$key]) ? $_POST[$key] : $default;
    }

    public static function get($key = null, $default = null) {
        if ($key === null) {
            return $_GET;
        }
        return isset($_GET[$key]) ? $_GET[$key] : $default;
    }

    public static function json() {
        $input = file_get_contents('php://input');
        return json_decode($input, true);
    }

    public static function isPost() {
        return $_SERVER['REQUEST_METHOD'] === 'POST';
    }

    public static function isGet() {
        return $_SERVER['REQUEST_METHOD'] === 'GET';
    }
}

class Security {
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }

    public static function generateToken($length = 32) {
        return bin2hex(random_bytes($length));
    }

    public static function sanitize($input) {
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }

    public static function validateStudentId($studentId) {
        return preg_match('/^\d{12}$/', $studentId);
    }

    public static function validateEmail($email) {
        return preg_match('/^\d{12}-st@rmutsb\.ac\.th$/', $email);
    }
}

class Session {
    public static function start() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public static function set($key, $value) {
        self::start();
        $_SESSION[$key] = $value;
    }

    public static function get($key, $default = null) {
        self::start();
        return isset($_SESSION[$key]) ? $_SESSION[$key] : $default;
    }

    public static function remove($key) {
        self::start();
        unset($_SESSION[$key]);
    }

    public static function destroy() {
        self::start();
        session_destroy();
    }

    public static function isLoggedIn() {
        return self::get('user_id') !== null;
    }

    public static function getUser() {
        return self::get('user_data');
    }
}

if (basename($_SERVER['PHP_SELF']) === 'Connect.php') {
    $db = new Database();
    $result = $db->testConnection();
    Response::json($result);
}
?>
