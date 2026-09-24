/// Error dari backend (atau dari ApiClient sendiri, mis. belum login).
///
/// [statusCode] = HTTP status dari response (null kalau error-nya bukan
/// dari response, mis. token gak ada). [code] = field `code` di body
/// error backend, dipakai buat kasus yang perlu ditangani khusus di UI --
/// contoh: "BELUM_CHECKOUT" dari POST /api/petugas/check-in.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? code;

  ApiException(this.message, {this.statusCode, this.code});

  @override
  String toString() => message;
}