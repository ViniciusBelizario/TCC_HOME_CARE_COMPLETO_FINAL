import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';
import 'auth_store.dart';

class ApiClient {
  ApiClient._();
  static final ApiClient I = ApiClient._();

  Future<http.Response> get(String path,
      {Map<String, String>? headers, Map<String, String>? query}) async {
    final uri =
        Uri.parse('${AppConfig.baseUrl}$path').replace(queryParameters: query);
    return await http.get(uri, headers: await _headers(headers));
  }

  Future<http.Response> post(String path,
      {Object? body, Map<String, String>? headers}) async {
    final uri = Uri.parse('${AppConfig.baseUrl}$path');
    return await http.post(uri, headers: await _headers(headers), body: body);
  }

  Future<http.Response> patch(String path,
      {Object? body, Map<String, String>? headers}) async {
    final uri = Uri.parse('${AppConfig.baseUrl}$path');
    return await http.patch(uri, headers: await _headers(headers), body: body);
  }

  Future<Map<String, String>> _headers(Map<String, String>? extra) async {
    final map = <String, String>{
      'Accept': 'application/json',
    };
    if (extra != null) map.addAll(extra);
    final token = await AuthStore.I.getToken();
    if (token != null && token.isNotEmpty) {
      map['Authorization'] = 'Bearer $token';
    }
    return map;
  }

  // Helpers JSON
  String jsonBody(Map data) => jsonEncode(data);
  dynamic decode(String s) => jsonDecode(s);
}
