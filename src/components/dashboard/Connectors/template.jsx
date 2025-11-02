export const generateConnectorPluginCode = (apiKey, hubUrl) => {
  return `<?php
/**
 * Plugin Name: WP Plugin Hub Connector
 * Description: Verbindt deze WordPress site met WP Plugin Hub voor centraal plugin beheer
 * Version: 1.0.0
 * Author: WP Plugin Hub
 */

if (!defined('ABSPATH')) {
    exit;
}

class WPPluginHubConnector {
    private $api_key = '${apiKey}';
    private $hub_url = '${hubUrl}';

    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
        $namespace = 'wphub/v1';

        // Test connection endpoint
        register_rest_route($namespace, '/testConnection', array(
            'methods' => 'POST',
            'callback' => array($this, 'test_connection'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        // List all plugins
        register_rest_route($namespace, '/listPlugins', array(
            'methods' => 'POST',
            'callback' => array($this, 'list_plugins'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        // Get installed plugins with details
        register_rest_route($namespace, '/getInstalledPlugins', array(
            'methods' => 'POST',
            'callback' => array($this, 'get_installed_plugins'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        // Install plugin
        register_rest_route($namespace, '/installPlugin', array(
            'methods' => 'POST',
            'callback' => array($this, 'install_plugin'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        // Toggle plugin activation state
        register_rest_route($namespace, '/togglePlugin', array(
            'methods' => 'POST',
            'callback' => array($this, 'toggle_plugin'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        // Uninstall plugin
        register_rest_route($namespace, '/uninstallPlugin', array(
            'methods' => 'POST',
            'callback' => array($this, 'uninstall_plugin'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        // Download plugin from WordPress site
        register_rest_route($namespace, '/downloadPlugin', array(
            'methods' => 'POST',
            'callback' => array($this, 'download_plugin'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        // Update self endpoint
        register_rest_route($namespace, '/updateSelf', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_self'),
            'permission_callback' => array($this, 'verify_api_key')
        ));
    }

    public function verify_api_key($request) {
        $params = $request->get_json_params();
        $provided_key = isset($params['api_key']) ? $params['api_key'] : '';
        
        if ($provided_key !== $this->api_key) {
            return new WP_Error('invalid_api_key', 'Invalid API key', array('status' => 401));
        }
        
        return true;
    }

    public function test_connection($request) {
        global $wp_version;
        
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        
        $all_plugins = get_plugins();
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Verbinding succesvol',
            'wp_version' => $wp_version,
            'plugins_count' => count($all_plugins),
            'site_url' => get_site_url(),
            'timestamp' => current_time('mysql')
        ));
    }

    public function list_plugins($request) {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $all_plugins = get_plugins();
        $active_plugins = get_option('active_plugins', array());
        
        $plugins_list = array();
        
        foreach ($all_plugins as $plugin_file => $plugin_data) {
            $slug = dirname($plugin_file);
            if ($slug === '.') {
                $slug = basename($plugin_file, '.php');
            }
            
            $is_active = in_array($plugin_file, $active_plugins);
            
            $plugins_list[] = array(
                'name' => $plugin_data['Name'],
                'slug' => $slug,
                'version' => $plugin_data['Version'],
                'status' => $is_active ? 'active' : 'inactive',
                'plugin_file' => $plugin_file,
                'update' => 'none',
                'update_version' => null
            );
        }

        return rest_ensure_response(array(
            'success' => true,
            'plugins' => $plugins_list,
            'total' => count($plugins_list)
        ));
    }

    public function get_installed_plugins($request) {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $all_plugins = get_plugins();
        $active_plugins = get_option('active_plugins', array());
        
        $plugins_list = array();
        
        foreach ($all_plugins as $plugin_file => $plugin_data) {
            $slug = dirname($plugin_file);
            if ($slug === '.') {
                $slug = basename($plugin_file, '.php');
            }
            
            $is_active = in_array($plugin_file, $active_plugins);
            
            $plugins_list[] = array(
                'name' => $plugin_data['Name'],
                'slug' => $slug,
                'version' => $plugin_data['Version'],
                'description' => $plugin_data['Description'],
                'author' => strip_tags($plugin_data['Author']),
                'is_active' => $is_active
            );
        }

        return rest_ensure_response(array(
            'success' => true,
            'plugins' => $plugins_list,
            'total' => count($plugins_list)
        ));
    }

    public function install_plugin($request) {
        $params = $request->get_json_params();
        $file_url = isset($params['file_url']) ? $params['file_url'] : '';
        $plugin_slug = isset($params['plugin_slug']) ? $params['plugin_slug'] : '';

        if (empty($file_url)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'File URL is required'
            ));
        }

        if (!function_exists('download_url')) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }
        if (!class_exists('Plugin_Upgrader')) {
            require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        }
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        // Download the plugin ZIP file
        $temp_file = download_url($file_url);
        
        if (is_wp_error($temp_file)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Failed to download plugin: ' . $temp_file->get_error_message()
            ));
        }

        // Install the plugin
        $upgrader = new Plugin_Upgrader(new WP_Ajax_Upgrader_Skin());
        $result = $upgrader->install($temp_file);

        // Clean up temp file
        @unlink($temp_file);

        if (is_wp_error($result)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Installation failed: ' . $result->get_error_message()
            ));
        }

        if ($result === true) {
            return rest_ensure_response(array(
                'success' => true,
                'message' => 'Plugin installed successfully',
                'slug' => $plugin_slug
            ));
        }

        return rest_ensure_response(array(
            'success' => false,
            'message' => 'Installation failed'
        ));
    }

    public function toggle_plugin($request) {
        $params = $request->get_json_params();
        $plugin_slug = isset($params['plugin_slug']) ? $params['plugin_slug'] : '';

        if (empty($plugin_slug)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Plugin slug is required'
            ));
        }

        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        if (!function_exists('activate_plugin')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        if (!function_exists('deactivate_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        // Find the plugin file
        $all_plugins = get_plugins();
        $plugin_file = null;

        foreach ($all_plugins as $file => $plugin_data) {
            $slug = dirname($file);
            if ($slug === '.') {
                $slug = basename($file, '.php');
            }
            
            if ($slug === $plugin_slug) {
                $plugin_file = $file;
                break;
            }
        }

        if (!$plugin_file) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Plugin not found'
            ));
        }

        // Check current status
        $active_plugins = get_option('active_plugins', array());
        $is_active = in_array($plugin_file, $active_plugins);

        // Toggle the state
        if ($is_active) {
            // Deactivate
            deactivate_plugins($plugin_file);
            $new_status = 'inactive';
            $message = 'Plugin deactivated successfully';
        } else {
            // Activate
            $result = activate_plugin($plugin_file);
            
            if (is_wp_error($result)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'message' => 'Activation failed: ' . $result->get_error_message()
                ));
            }
            
            $new_status = 'active';
            $message = 'Plugin activated successfully';
        }

        return rest_ensure_response(array(
            'success' => true,
            'message' => $message,
            'new_status' => $new_status
        ));
    }

    public function uninstall_plugin($request) {
        $params = $request->get_json_params();
        $plugin_slug = isset($params['plugin_slug']) ? $params['plugin_slug'] : '';

        if (empty($plugin_slug)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Plugin slug is required'
            ));
        }

        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        if (!function_exists('delete_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        // Find the plugin file
        $all_plugins = get_plugins();
        $plugin_file = null;

        foreach ($all_plugins as $file => $plugin_data) {
            $slug = dirname($file);
            if ($slug === '.') {
                $slug = basename($file, '.php');
            }
            
            if ($slug === $plugin_slug) {
                $plugin_file = $file;
                break;
            }
        }

        if (!$plugin_file) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Plugin not found'
            ));
        }

        // First deactivate if active
        deactivate_plugins($plugin_file);

        // Then delete
        $result = delete_plugins(array($plugin_file));

        if (is_wp_error($result)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Uninstall failed: ' . $result->get_error_message()
            ));
        }

        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Plugin uninstalled successfully'
        ));
    }

    public function download_plugin($request) {
        $params = $request->get_json_params();
        $plugin_slug = isset($params['plugin_slug']) ? $params['plugin_slug'] : '';

        if (empty($plugin_slug)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Plugin slug is required'
            ));
        }

        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        // Find the plugin
        $all_plugins = get_plugins();
        $plugin_file = null;
        $plugin_data = null;

        foreach ($all_plugins as $file => $data) {
            $slug = dirname($file);
            if ($slug === '.') {
                $slug = basename($file, '.php');
            }
            
            if ($slug === $plugin_slug) {
                $plugin_file = $file;
                $plugin_data = $data;
                break;
            }
        }

        if (!$plugin_file) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Plugin not found'
            ));
        }

        // Get plugin directory path
        $plugin_dir = WP_PLUGIN_DIR . '/' . dirname($plugin_file);
        
        if (!file_exists($plugin_dir)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Plugin directory not found'
            ));
        }

        // Create ZIP file
        if (!class_exists('ZipArchive')) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'ZipArchive extension not available'
            ));
        }

        $zip = new ZipArchive();
        $zip_file = sys_get_temp_dir() . '/' . $plugin_slug . '.zip';

        if ($zip->open($zip_file, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Failed to create ZIP file'
            ));
        }

        // Add all plugin files to ZIP
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($plugin_dir),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $file) {
            if (!$file->isDir()) {
                $file_path = $file->getRealPath();
                $relative_path = $plugin_slug . '/' . substr($file_path, strlen($plugin_dir) + 1);
                $zip->addFile($file_path, $relative_path);
            }
        }

        $zip->close();

        // Read ZIP file as base64
        $zip_content = file_get_contents($zip_file);
        $zip_base64 = base64_encode($zip_content);

        // Clean up temp file
        @unlink($zip_file);

        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Plugin downloaded successfully',
            'plugin_data' => array(
                'name' => $plugin_data['Name'],
                'version' => $plugin_data['Version'],
                'description' => $plugin_data['Description'],
                'author' => strip_tags($plugin_data['Author'])
            ),
            'zip_base64' => $zip_base64
        ));
    }

    public function update_self($request) {
        $params = $request->get_json_params();
        $file_url = isset($params['file_url']) ? $params['file_url'] : '';
        $new_version = isset($params['new_version']) ? $params['new_version'] : '';

        if (empty($file_url)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'File URL is required'
            ));
        }

        if (!function_exists('download_url')) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }
        if (!class_exists('Plugin_Upgrader')) {
            require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        }
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        // Find current connector plugin
        $all_plugins = get_plugins();
        $plugin_file = null;
        
        foreach ($all_plugins as $file => $plugin_data) {
            if (strpos($file, 'wp-plugin-hub-connector') !== false) {
                $plugin_file = $file;
                break;
            }
        }

        if (!$plugin_file) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Connector plugin not found'
            ));
        }

        $was_active = is_plugin_active($plugin_file);

        // Download the new version
        $temp_file = download_url($file_url);
        
        if (is_wp_error($temp_file)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Failed to download new version: ' . $temp_file->get_error_message()
            ));
        }

        // Deactivate current version
        deactivate_plugins($plugin_file);

        // Delete current version
        $deleted = delete_plugins(array($plugin_file));
        
        if (is_wp_error($deleted)) {
            @unlink($temp_file);
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Failed to delete old version: ' . $deleted->get_error_message()
            ));
        }

        // Install new version
        $upgrader = new Plugin_Upgrader(new WP_Ajax_Upgrader_Skin());
        $result = $upgrader->install($temp_file);

        // Clean up temp file
        @unlink($temp_file);

        if (is_wp_error($result)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'Failed to install new version: ' . $result->get_error_message()
            ));
        }

        // Find the new plugin file
        $all_plugins = get_plugins();
        $new_plugin_file = null;
        
        foreach ($all_plugins as $file => $plugin_data) {
            if (strpos($file, 'wp-plugin-hub-connector') !== false) {
                $new_plugin_file = $file;
                break;
            }
        }

        // Reactivate if it was active before
        if ($was_active && $new_plugin_file) {
            activate_plugin($new_plugin_file);
        }

        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Connector plugin successfully updated to version ' . $new_version,
            'new_version' => $new_version
        ));
    }
}

// Initialize the connector
new WPPluginHubConnector();
`;
};