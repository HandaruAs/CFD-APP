class MenuModel {
  final String label;
  final String? path;
  final String iconName;

  MenuModel({
    required this.label,
    this.path,
    required this.iconName,
  });

  factory MenuModel.fromJson(Map<String, dynamic> json) {
    return MenuModel(
      label: json['name'] as String,
      path: json['route'] as String?,
      iconName: json['icon'] as String? ?? 'circle',
    );
  }
}