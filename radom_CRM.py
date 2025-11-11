#!/usr/bin/env python3
"""
gera_crm_teste.py
Gera dados de médicos fictícios para testes (IDs marcados como TEST-CRM).
Uso:
    python gera_crm_teste.py [quantidade] [saida]
Exemplo:
    python gera_crm_teste.py 50 medicos_teste.csv
Saída: CSV (por extensão .csv) ou JSON (por extensão .json).
"""

import sys
import random
import csv
import json
from datetime import date

# --- Configurações ---
DEFAULT_QTY = 20
STATES = ["SP","RJ","MG","BA","RS","PR","SC","GO","PE","CE","AM","PA"]
SPECIALTIES = [
    "Clínica Geral","Pediatria","Cardiologia","Ortopedia","Ginecologia",
    "Dermatologia","Psiquiatria","Endocrinologia","Neurologia","Oftalmologia",
    "Otorrinolaringologia","Oncologia","Gastroenterologia","Urologia"
]
FIRST_NAMES = [
    "Carlos","Mariana","João","Ana","Lucas","Beatriz","Pedro","Fernanda",
    "Rafael","Larissa","Guilherme","Camila","Vinícius","Isabela","Mateus",
    "Marcos","Juliana","Thiago","Marina","Ricardo"
]
LAST_NAMES = [
    "Silva","Souza","Oliveira","Santos","Pereira","Costa","Rodrigues",
    "Almeida","Nascimento","Gomes","Martins","Araújo","Barbosa","Ribeiro"
]
# ----------------------

def gerar_nome():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def gerar_crm_test(state=None):
    """Gera um ID marcado como TEST-CRM para uso em testes."""
    if state is None:
        state = random.choice(STATES)
    number = random.randint(100000, 999999)
    # Formato facilmente identificável como teste
    return f"TEST-CRM-{state}-{number:06d}"

def gerar_email(nome):
    # email simples para teste (não garante unicidade absoluta)
    safe = nome.lower().replace(" ", ".").replace("ú","u").replace("á","a").replace("í","i")
    return f"{safe}.{random.randint(1,99)}@example.test"

def gerar_medico():
    nome = gerar_nome()
    state = random.choice(STATES)
    return {
        "nome": nome,
        "crm": gerar_crm_test(state),
        "estado": state,
        "especialidade": random.choice(SPECIALTIES),
        "email": gerar_email(nome),
        "telefone": f"+55 ({random.randint(11,99)}) 9{random.randint(8000,9999)}-{random.randint(1000,9999)}",
        "registro_tipo": "TEST_ONLY",
        "gerado_em": date.today().isoformat()
    }

def salvar_csv(medicos, caminho):
    keys = list(medicos[0].keys())
    with open(caminho, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for m in medicos:
            writer.writerow(m)

def salvar_json(medicos, caminho):
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(medicos, f, ensure_ascii=False, indent=2)

def main():
    qty = DEFAULT_QTY
    out = "medicos_teste.csv"

    if len(sys.argv) >= 2:
        try:
            qty = int(sys.argv[1])
        except ValueError:
            print("Primeiro argumento deve ser um número (quantidade). Usando padrão:", DEFAULT_QTY)
            qty = DEFAULT_QTY
    if len(sys.argv) >= 3:
        out = sys.argv[2]

    medicos = [gerar_medico() for _ in range(qty)]

    if out.lower().endswith(".json"):
        salvar_json(medicos, out)
        print(f"{len(medicos)} registros salvos em (JSON): {out}")
    else:
        # padrão CSV
        salvar_csv(medicos, out)
        print(f"{len(medicos)} registros salvos em (CSV): {out}")

if __name__ == "__main__":
    main()
