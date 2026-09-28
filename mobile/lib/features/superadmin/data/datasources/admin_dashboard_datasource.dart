import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/superadmin/domain/entities/admin_dashboard.dart';

class AdminDashboardDatasource {
  /// GET /api/admin/dashboard (khusus role superadmin)
  static Future<AdminDashboard> fetch() async {
    final data = await ApiClient.get('/api/admin/dashboard');
    if (data is! Map<String, dynamic>) {
      throw ApiException('Format respons dashboard tidak dikenal.');
    }
    return AdminDashboard.fromJson(data);
  }
}