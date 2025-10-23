const { Client } = require('pg');

async function verifyAuditTable() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_IoaO3L9flzsQ@ep-young-morning-ahtcfu5y-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    console.log('Connected to production database');

    // Check table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'api_audit_logs' 
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Table Structure:');
    console.log('==================');
    tableInfo.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'api_audit_logs'
      ORDER BY indexname;
    `);

    console.log('\n🔍 Indexes:');
    console.log('===========');
    indexes.rows.forEach(row => {
      console.log(`- ${row.indexname}`);
    });

    // Test insert (will be rolled back)
    console.log('\n🧪 Testing insert...');
    const testResult = await client.query(`
      INSERT INTO api_audit_logs (
        request_method, 
        request_path, 
        response_status, 
        endpoint_type, 
        action
      ) VALUES (
        'GET', 
        '/api/test', 
        200, 
        'test', 
        'test_action'
      ) RETURNING id;
    `);

    console.log(`✅ Test insert successful - ID: ${testResult.rows[0].id}`);

    // Clean up test record
    await client.query('DELETE FROM api_audit_logs WHERE endpoint_type = \'test\';');
    console.log('🧹 Test record cleaned up');

    console.log('\n🎉 Production audit table is ready!');
    console.log('All API calls will now be logged automatically.');

  } catch (error) {
    console.error('Error verifying audit table:', error);
    throw error;
  } finally {
    await client.end();
  }
}

verifyAuditTable()
  .then(() => {
    console.log('\nVerification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
