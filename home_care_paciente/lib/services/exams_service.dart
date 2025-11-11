import 'dart:io';
import 'package:http/http.dart' as http;
import '../core/api_client.dart';
import '../core/config.dart';
import '../core/auth_store.dart';

class ExamsService {
  Future<void> upload({required File file, String? description}) async {
    final uri = Uri.parse('${AppConfig.baseUrl}/exams/upload');
    final req = http.MultipartRequest('POST', uri);
    final token = await AuthStore.I.getToken();
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    req.files.add(await http.MultipartFile.fromPath('file', file.path));
    if (description != null && description.isNotEmpty) {
      req.fields['description'] = description;
    }
    final resp = await req.send();
    if (resp.statusCode != 201) {
      throw Exception('Falha no upload (${resp.statusCode})');
    }
  }
}
