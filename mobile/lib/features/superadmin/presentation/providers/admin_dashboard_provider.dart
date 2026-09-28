import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/superadmin/data/datasources/admin_dashboard_datasource.dart';
import 'package:mobile/features/superadmin/domain/entities/admin_dashboard.dart';

/// Dashboard superadmin itu murni baca (gak ada aksi), jadi cukup
/// FutureProvider -- gak perlu StateNotifier + state class kayak fitur
/// yang punya aksi tulis. autoDispose: begitu shell ditutup (logout),
/// data user sebelumnya ikut hilang, gak bocor ke user berikutnya.
final adminDashboardProvider = FutureProvider.autoDispose<AdminDashboard>((ref) {
  return AdminDashboardDatasource.fetch();
});