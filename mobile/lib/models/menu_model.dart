class MenuModel {
  final String label;
  final String path; 
  final String iconName; 

  MenuModel({
    required this.label,
    required this.path,
    required this.iconName,
  });

  factory MenuModel.fromJson(Map<String, dynamic> json) {
    return MenuModel(
      label: json['label'] as String,
      path: json['path'] as String,
      iconName: json['icon_name'] as String,
    );
  }
}