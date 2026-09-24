import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/models/menu_model.dart';

class MenuRemoteDatasource {
  static Future<List<MenuModel>> fetchUserMenus() async {
    final data = await ApiClient.get('/api/menus');
    return (data as List<dynamic>)
        .map((json) => MenuModel.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}