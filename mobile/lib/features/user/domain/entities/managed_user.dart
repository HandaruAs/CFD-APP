class ManagedUser {
  final String id;
  final String name;
  final String email;
  final String status;
  final List<String> roles;

  ManagedUser({
    required this.id,
    required this.name,
    required this.email,
    required this.status,
    required this.roles,
  });

  factory ManagedUser.fromJson(Map<String, dynamic> json) {
    return ManagedUser(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      status: json['status'] ?? 'pending',
      roles: json['roles'] != null ? List<String>.from(json['roles']) : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'status': status,
      'roles': roles,
    };
  }
}