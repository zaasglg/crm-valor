const { sequelize } = require('./models');

async function fixBackupIssue() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // 1. Удаляем существующую таблицу backup если она есть
    await sequelize.query('DROP TABLE IF EXISTS `Clients_backup`;');
    console.log('Dropped existing Clients_backup table');

    // 2. Создаем новую таблицу backup
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`Clients_backup\` (
        \`id\` INTEGER PRIMARY KEY,
        \`name\` VARCHAR(255),
        \`channel\` VARCHAR(255) NOT NULL,
        \`external_id\` VARCHAR(255) NOT NULL,
        \`created_at\` DATETIME,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        \`assigned_to\` VARCHAR(255),
        \`comment\` TEXT
      );
    `);
    console.log('Created new Clients_backup table');

    // 3. Вставляем данные, исключая записи с NULL id
    const result = await sequelize.query(`
      INSERT INTO \`Clients_backup\` 
      SELECT \`id\`, \`name\`, \`channel\`, \`external_id\`, \`created_at\`, \`createdAt\`, \`updatedAt\`, \`assigned_to\`, \`comment\`
      FROM \`Clients\` 
      WHERE \`id\` IS NOT NULL;
    `);
    
    console.log('Backup completed successfully');
    console.log('Records copied:', result[1]);

    // 4. Проверяем количество записей
    const [originalCount] = await sequelize.query('SELECT COUNT(*) as count FROM `Clients`;');
    const [backupCount] = await sequelize.query('SELECT COUNT(*) as count FROM `Clients_backup`;');
    
    console.log(`Original table records: ${originalCount[0].count}`);
    console.log(`Backup table records: ${backupCount[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixBackupIssue();