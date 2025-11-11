import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class AuthStore {
  AuthStore._();
  static final AuthStore I = AuthStore._();

  static const _kToken = 'auth_token';
  static const _kUserId = 'user_id';
  static const _kName = 'user_name';
  static const _kEmail = 'user_email';
  static const _kRole = 'user_role';

  Future<bool> loginWithCpf(
      {required String cpf, required String password}) async {
    final resp = await ApiClient.I.post(
      '/auth/login',
      headers: {'Content-Type': 'application/json'},
      body: ApiClient.I.jsonBody({'cpf': cpf, 'password': password}),
    );

    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body) as Map<String, dynamic>;
      final token = data['token'] as String;
      final user = data['user'] as Map<String, dynamic>;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kToken, token);
      await prefs.setInt(_kUserId, user['id'] as int);
      await prefs.setString(_kName, (user['name'] ?? '') as String);
      await prefs.setString(_kEmail, (user['email'] ?? '') as String);
      await prefs.setString(_kRole, (user['role'] ?? '') as String);
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kToken);
    await prefs.remove(_kUserId);
    await prefs.remove(_kName);
    await prefs.remove(_kEmail);
    await prefs.remove(_kRole);
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kToken);
  }

  Future<int?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_kUserId);
  }

  Future<String?> getRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kRole);
  }

  Future<bool> isLogged() async => (await getToken())?.isNotEmpty == true;
}
