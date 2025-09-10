// Тестовый скрипт для проверки системы очередей
const { sequelize, User, Client, Settings } = require('./models');
const ChatDistributionService = require('./chatDistributionService');

async function testQueueSystem() {
  try {
    // Создаем тестовых менеджеров
    console.log('Создание тестовых менеджеров...');
    await User.bulkCreate([
      { username: 'fd1', password: '123', role: 'fd_manager', is_active: true },
      { username: 'fd2', password: '123', role: 'fd_manager', is_active: true },
      { username: 'rd1', password: '123', role: 'rd_manager', is_active: true }
    ], { ignoreDuplicates: true });

    console.log('Создание настроек распределения...');
    await Settings.upsert({
      key: 'distribution_method',
      value: JSON.stringify('round-robin')
    });

    // Создаем тестового клиента
    console.log('Создание тестового клиента...');
    const [client] = await Client.findOrCreate({
      where: { external_id: 'test123' },
      defaults: {
        name: 'Тестовый клиент',
        channel: 'telegram',
        external_id: 'test123'
      }
    });

    console.log('Тестовый клиент создан:', client.id);

    // Тестируем распределение
    const distributionService = new ChatDistributionService();

    console.log('\n=== Тестирование метода round-robin ===');
    const assignedManager = await distributionService.assignChatToManager(client.id);

    if (assignedManager) {
      console.log(`✅ Чат назначен менеджеру: ${assignedManager}`);
    } else {
      console.log('❌ Не удалось назначить чат');
    }

    // Проверяем список активных ФД-менеджеров
    const fdManagers = await distributionService.getActiveFdManagers();
    console.log('Активные ФД-менеджеры:', fdManagers.map(m => m.username));

    // Проверяем нагрузку
    for (const manager of fdManagers) {
      const load = await distributionService.getManagerLoad(manager.username);
      console.log(`Нагрузка ${manager.username}: ${load} чатов`);
    }

    // Создаем второго тестового клиента
    console.log('Создание второго тестового клиента...');
    const [client2] = await Client.findOrCreate({
      where: { external_id: 'test456' },
      defaults: {
        name: 'Тестовый клиент 2',
        channel: 'telegram',
        external_id: 'test456'
      }
    });

    console.log('Второй тестовый клиент создан:', client2.id);

    // Тестируем распределение второго клиента
    const assignedManager2 = await distributionService.assignChatToManager(client2.id);

    if (assignedManager2) {
      console.log(`✅ Второй чат назначен менеджеру: ${assignedManager2}`);
    } else {
      console.log('❌ Не удалось назначить второй чат');
    }

    // Проверяем нагрузку после второго назначения
    const fdManagers2 = await distributionService.getActiveFdManagers();
    for (const manager of fdManagers2) {
      const load = await distributionService.getManagerLoad(manager.username);
      console.log(`Нагрузка ${manager.username}: ${load} чатов`);
    }

    console.log('\n=== Тестирование метода by_load ===');
    await Settings.upsert({
      key: 'distribution_method',
      value: JSON.stringify('by_load')
    });

    // Создаем третьего клиента
    const [client3] = await Client.findOrCreate({
      where: { external_id: 'test789' },
      defaults: {
        name: 'Тестовый клиент 3',
        channel: 'telegram',
        external_id: 'test789'
      }
    });

    const assignedManager3 = await distributionService.assignChatToManager(client3.id);
    console.log(`Третий чат (by_load) назначен: ${assignedManager3}`);

    // Проверяем финальную нагрузку
    const fdManagers3 = await distributionService.getActiveFdManagers();
    for (const manager of fdManagers3) {
      const load = await distributionService.getManagerLoad(manager.username);
      console.log(`Финальная нагрузка ${manager.username}: ${load} чатов`);
    }

    console.log('=== Тест завершен ===');

  } catch (error) {
    console.error('Ошибка тестирования:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  testQueueSystem();
}

module.exports = { testQueueSystem };
