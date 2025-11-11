bool validarCPF(String cpf) {
  cpf = cpf.replaceAll(RegExp(r'[^0-9]'), '');
  if (cpf.length != 11) return false;
  if (RegExp(r'^(\d)\1*$').hasMatch(cpf)) return false;
  List<int> digits = cpf.split('').map(int.parse).toList();
  int sum = 0;
  for (int i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  int firstCheck = 11 - (sum % 11);
  if (firstCheck >= 10) firstCheck = 0;
  if (digits[9] != firstCheck) return false;
  sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  int secondCheck = 11 - (sum % 11);
  if (secondCheck >= 10) secondCheck = 0;
  if (digits[10] != secondCheck) return false;
  return true;
}
