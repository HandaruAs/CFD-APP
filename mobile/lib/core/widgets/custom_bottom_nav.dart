import 'package:flutter/material.dart';
import 'package:mobile/core/models/menu_model.dart';
import 'package:mobile/core/themes/app_theme.dart';

class CustomBottomNav extends StatelessWidget {
  final List<MenuModel> items;
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final IconData Function(String) getIcon;

  const CustomBottomNav({
    required this.items,
    required this.selectedIndex,
    required this.onSelect,
    required this.getIcon,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: onSelect,
      backgroundColor: Colors.white,
      indicatorColor: kBrandColor.withValues(alpha: 0.12),
      destinations: items.map((item) {
        return NavigationDestination(
          icon: Icon(getIcon(item.iconName)),
          selectedIcon: Icon(
            getIcon(item.iconName),
            color: kBrandColor,
          ),
          label: _shortenLabel(item.label),
          tooltip: item.label,
        );
      }).toList(),
    );
  }

  /// Shorten long labels untuk navbar (misal "Jam Operasional" -> "Jam Op.")
  String _shortenLabel(String label) {
    final Map<String, String> shorten = {
      'Jam Operasional': 'Jam Op.',
      'Manajemen Lapak': 'Lapak',
      'Manajemen User': 'User',
      'Scan QR': 'Scan QR',
    };
    return shorten[label] ?? label;
  }
}
