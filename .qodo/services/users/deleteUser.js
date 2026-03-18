// 📁 .qodo/services/users/deleteUser.js
const { supabaseAdmin } = require('./supabaseAdmin.js');

async function deleteAuthUser(userId) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error('❌ Erro ao deletar user:', error.message);
    throw error;
  }

  return true;
}

module.exports = { deleteAuthUser };
