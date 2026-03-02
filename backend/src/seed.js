// src/seed.js — Seed de usuários iniciais
// Executado automaticamente pelo entrypoint na primeira inicialização

const { Pool } = require('pg')
const bcrypt   = require('bcryptjs')

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'sigpol',
  user:     process.env.DB_USER     || 'sigpol_user',
  password: process.env.DB_PASSWORD || 'sigpol_dev_pass',
})

const USUARIOS = [
  {
    login: 'admin',       senha: 'Admin@2026!',  perfil: 'Administrador',
    nome_guerra: 'Administrador', nome_completo: 'Administrador do Sistema',
    rg_pm: 'ADM-0001', cpf: '000.000.001-91', posto_graduacao: 'Coronel',
    sexo: 'M', data_nascimento: '1980-01-01', data_ingresso: '2000-01-01',
    unidade_codigo: 'PMESP',
  },
  {
    login: 'comandante',  senha: 'Cmd@2026!',    perfil: 'Comandante',
    nome_guerra: 'Cmt. Silva', nome_completo: 'Carlos Eduardo Silva',
    rg_pm: '12345-PM', cpf: '111.111.111-11', posto_graduacao: 'Coronel',
    sexo: 'M', data_nascimento: '1975-03-15', data_ingresso: '1995-03-15',
    unidade_codigo: '1BPM',
  },
  {
    login: 'gestor',      senha: 'Gestor@2026!', perfil: 'Gestor',
    nome_guerra: 'Maj. Costa', nome_completo: 'Roberto Costa Filho',
    rg_pm: '23456-PM', cpf: '222.222.222-22', posto_graduacao: 'Major',
    sexo: 'M', data_nascimento: '1980-07-22', data_ingresso: '2002-07-22',
    unidade_codigo: '1BPM',
  },
  {
    login: 'supervisor',  senha: 'Super@2026!',  perfil: 'Supervisor',
    nome_guerra: 'Cap. Lima', nome_completo: 'Ana Paula Lima Santos',
    rg_pm: '34567-PM', cpf: '333.333.333-33', posto_graduacao: 'Capitão',
    sexo: 'F', data_nascimento: '1985-11-10', data_ingresso: '2008-11-10',
    unidade_codigo: '1BPM',
  },
  {
    login: 'operador',    senha: 'Oper@2026!',   perfil: 'Operador',
    nome_guerra: 'Cb. Souza', nome_completo: 'Marcos Antonio Souza',
    rg_pm: '45678-PM', cpf: '444.444.444-44', posto_graduacao: 'Cabo',
    sexo: 'M', data_nascimento: '1995-05-30', data_ingresso: '2018-05-30',
    unidade_codigo: '1BPM',
  },
]

async function seed() {
  let client
  try {
    client = await pool.connect()
    console.log('✅ Conectado ao PostgreSQL')
    await client.query('BEGIN')

    for (const u of USUARIOS) {
      const { rows: unidade } = await client.query(
        'SELECT id FROM unidades WHERE codigo = $1', [u.unidade_codigo]
      )
      if (!unidade[0]) {
        console.warn(`⚠  Unidade ${u.unidade_codigo} não encontrada, pulando ${u.login}`)
        continue
      }

      const { rows: policial } = await client.query(
        `INSERT INTO policiais
           (rg_pm, cpf, nome_completo, nome_guerra, sexo,
            data_nascimento, data_ingresso, posto_graduacao, id_unidade)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (rg_pm) DO UPDATE SET nome_guerra = EXCLUDED.nome_guerra
         RETURNING id`,
        [u.rg_pm, u.cpf, u.nome_completo, u.nome_guerra, u.sexo,
         u.data_nascimento, u.data_ingresso, u.posto_graduacao, unidade[0].id]
      )

      const senha_hash = await bcrypt.hash(u.senha, 10)
      await client.query(
        `INSERT INTO usuarios (id_policial, login, senha_hash, perfil)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (login) DO UPDATE SET senha_hash = EXCLUDED.senha_hash`,
        [policial[0].id, u.login, senha_hash, u.perfil]
      )
      console.log(`  ✅ ${u.perfil.padEnd(15)} ${u.login.padEnd(12)} → ${u.senha}`)
    }

    await client.query('COMMIT')
    console.log('🚔 Seed concluído!')
  } catch (err) {
    if (client) await client.query('ROLLBACK')
    console.error('❌ Erro no seed:', err.message)
    process.exit(1)
  } finally {
    if (client) client.release()
    await pool.end()
  }
}

seed()
