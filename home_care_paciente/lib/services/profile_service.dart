import 'dart:convert';
import '../core/api_client.dart';

class PatientProfile {
  final int userId;
  final DateTime? birthDate;
  final String? phone;
  final String? address;

  PatientProfile({
    required this.userId,
    this.birthDate,
    this.phone,
    this.address,
  });

  factory PatientProfile.fromJson(Map<String, dynamic> j) => PatientProfile(
        userId: j['userId'],
        birthDate: (j['birthDate'] == null || (j['birthDate'] as String).isEmpty)
            ? null
            : DateTime.tryParse(j['birthDate']),
        phone: j['phone'],
        address: j['address'],
      );
}

class Me {
  final int id;
  final String name;
  final String email;
  final String cpf;
  final String role;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final PatientProfile? patientProfile;

  Me({
    required this.id,
    required this.name,
    required this.email,
    required this.cpf,
    required this.role,
    this.createdAt,
    this.updatedAt,
    this.patientProfile,
  });

  factory Me.fromJson(Map<String, dynamic> j) => Me(
        id: j['id'],
        name: j['name'] ?? '',
        email: j['email'] ?? '',
        cpf: j['cpf'] ?? '',
        role: j['role'] ?? '',
        createdAt: j['createdAt'] != null ? DateTime.tryParse(j['createdAt']) : null,
        updatedAt: j['updatedAt'] != null ? DateTime.tryParse(j['updatedAt']) : null,
        patientProfile: (j['patientProfile'] != null)
            ? PatientProfile.fromJson(Map<String, dynamic>.from(j['patientProfile']))
            : null,
      );
}

class ProfileService {
  Future<Me> me() async {
    final resp = await ApiClient.I.get('/auth/me');
    if (resp.statusCode != 200) {
      throw Exception('Erro ao carregar perfil (${resp.statusCode})');
    }
    final j = jsonDecode(resp.body) as Map<String, dynamic>;
    return Me.fromJson(j);
  }
}
