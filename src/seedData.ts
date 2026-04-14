import { Client, Contractor, Payer, Order } from './types';

export const seedClients: Client[] = [
  { id: 'c1', name: 'ООО "Альфа Медиа"', phone: '+7 (495) 123-45-67', contactPerson: 'Иванов Алексей Петрович', email: 'ivanov@alfamedia.ru', note: 'Постоянный клиент. Предпочитает наружную рекламу.', customFields: [{ label: 'ИНН', value: '7701234567' }, { label: 'Юр. адрес', value: 'г. Москва, ул. Ленина, 15' }], createdAt: '2024-01-10T10:00:00Z' },
  { id: 'c2', name: 'ИП Смирнова Е.В.', phone: '+7 (916) 555-33-22', contactPerson: 'Смирнова Елена Викторовна', email: 'smirnova.ev@mail.ru', note: 'Кафе "Уют". Вывески и меню.', customFields: [{ label: 'Адрес кафе', value: 'г. Москва, ул. Пушкина, 8' }], createdAt: '2024-02-15T09:00:00Z' },
  { id: 'c3', name: 'ЗАО "СтройИнвест"', phone: '+7 (495) 777-88-99', contactPerson: 'Козлов Дмитрий Сергеевич', email: 'd.kozlov@stroyinvest.com', note: 'Строительная компания. Баннеры на объектах.', customFields: [{ label: 'ИНН', value: '7709876543' }, { label: 'Сайт', value: 'www.stroyinvest.com' }], createdAt: '2024-03-01T14:30:00Z' },
  { id: 'c4', name: 'Фитнес-клуб "Энергия"', phone: '+7 (495) 222-11-00', contactPerson: 'Петрова Марина Александровна', email: 'marketing@energia-fit.ru', note: 'Сеть фитнес-клубов, 5 филиалов.', customFields: [{ label: 'Кол-во филиалов', value: '5' }], createdAt: '2024-01-20T11:00:00Z' },
  { id: 'c5', name: 'ООО "ТехноПарк"', phone: '+7 (495) 333-44-55', contactPerson: 'Волков Андрей Игоревич', email: 'volkov@technopark.ru', note: 'IT-компания, полиграфия для выставок.', customFields: [{ label: 'Сфера', value: 'IT / ПО' }], createdAt: '2024-04-05T08:00:00Z' },
  { id: 'c6', name: 'Автосалон "Драйв"', phone: '+7 (495) 666-77-88', contactPerson: 'Новиков Сергей Валентинович', email: 'novikov@drive-auto.ru', note: 'Наружка и печать.', customFields: [], createdAt: '2024-05-10T10:00:00Z' },
  { id: 'c7', name: 'Ресторан "Гранд"', phone: '+7 (495) 111-22-33', contactPerson: 'Белова Ирина Олеговна', email: 'info@grand-rest.ru', note: 'Премиум сегмент.', customFields: [{ label: 'Адрес', value: 'г. Москва, Тверская, 22' }], createdAt: '2024-06-01T12:00:00Z' },
  { id: 'c8', name: 'ООО "Мебельный Рай"', phone: '+7 (495) 444-55-66', contactPerson: 'Сидоров Павел Николаевич', email: 'sidorov@mebelray.ru', note: 'Каталоги и наружка.', customFields: [], createdAt: '2024-03-15T09:30:00Z' },
  { id: 'c9', name: 'Клиника "Здоровье+"', phone: '+7 (495) 999-88-77', contactPerson: 'Морозова Анна Дмитриевна', email: 'morozova@zdorovieplus.ru', note: 'Буклеты, визитки, вывеска.', customFields: [{ label: 'Направление', value: 'Стоматология, Терапия' }], createdAt: '2024-07-01T10:00:00Z' },
  { id: 'c10', name: 'ИП Кузнецов А.А.', phone: '+7 (903) 111-00-99', contactPerson: 'Кузнецов Артём Андреевич', email: 'kuznetsov.aa@yandex.ru', note: 'Цветочный магазин "Букет".', customFields: [], createdAt: '2024-08-10T11:00:00Z' },
];

export const seedContractors: Contractor[] = [
  { id: 'con1', name: 'Типография "ПечатьПро"', phone: '+7 (495) 100-20-30', note: 'Офсетная и цифровая печать.', createdAt: '2024-01-05T10:00:00Z' },
  { id: 'con2', name: 'Монтажная бригада "ВысотаСервис"', phone: '+7 (495) 200-30-40', note: 'Монтаж наружной рекламы.', createdAt: '2024-01-05T10:00:00Z' },
  { id: 'con3', name: 'Дизайн-студия "Креатив"', phone: '+7 (495) 300-40-50', note: 'Макеты, дизайн, брендинг.', createdAt: '2024-01-10T10:00:00Z' },
  { id: 'con4', name: 'ООО "СветоТехника"', phone: '+7 (495) 400-50-60', note: 'Световые короба и неон.', createdAt: '2024-02-01T10:00:00Z' },
  { id: 'con5', name: 'Рекламное производство "БаннерМастер"', phone: '+7 (495) 500-60-70', note: 'Широкоформатная печать.', createdAt: '2024-02-15T10:00:00Z' },
  { id: 'con6', name: 'ИП Фёдоров - Фрезеровка', phone: '+7 (916) 600-70-80', note: 'ЧПУ фрезеровка.', createdAt: '2024-03-01T10:00:00Z' },
  { id: 'con7', name: 'Студия "Веб-Арт"', phone: '+7 (495) 700-80-90', note: 'Веб-дизайн, лендинги.', createdAt: '2024-04-01T10:00:00Z' },
  { id: 'con8', name: 'Курьерская служба "Быстрый"', phone: '+7 (495) 800-90-10', note: 'Доставка материалов.', createdAt: '2024-05-01T10:00:00Z' },
];

export const seedPayers: Payer[] = [
  { id: 'p1', name: 'Агентство (наличные)', createdAt: '2024-01-01T10:00:00Z' },
  { id: 'p2', name: 'Агентство (р/с)', createdAt: '2024-01-01T10:00:00Z' },
  { id: 'p3', name: 'Клиент напрямую', createdAt: '2024-01-01T10:00:00Z' },
  { id: 'p4', name: 'Директор (личная карта)', createdAt: '2024-01-01T10:00:00Z' },
  { id: 'p5', name: 'Петров И.И. (менеджер)', createdAt: '2024-03-01T10:00:00Z' },
];

const today = new Date();
const Y = today.getFullYear();
const M = today.getMonth();

function d(year: number, month: number, day: number): string {
  let y = year, m = month;
  while (m < 0) { m += 12; y--; }
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const seedOrders: Order[] = [
  {
    id: 'o1', date: d(Y, M, 2), clientId: 'c1', productName: 'Световой короб на фасад 3x1.5м',
    contractors: [
      { id: 'oe1', contractorId: 'con3', description: 'Дизайн макета светового короба', costFormula: '15000', costValue: 15000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe2', contractorId: 'con4', description: 'Изготовление светового короба', costFormula: '=45000+3000', costValue: 48000, payerId: 'p2', paid: true, reconciled: false, note: '3000 за доп. подсветку' },
      { id: 'oe3', contractorId: 'con2', description: 'Монтаж на фасад (высота 6м)', costFormula: '12000', costValue: 12000, payerId: 'p1', paid: false, reconciled: false, note: 'Нужен автовышка' },
    ],
    saleAmount: 120000, paymentReceiverId: 'p2', paymentNote: 'Счёт №127 от 02.01', paymentReceived: true, status: 'active', note: 'Срочный заказ', createdAt: d(Y, M, 2) + 'T09:00:00Z',
  },
  {
    id: 'o2', date: d(Y, M, 5), clientId: 'c2', productName: 'Вывеска кафе "Уют" + меню',
    contractors: [
      { id: 'oe4', contractorId: 'con3', description: 'Дизайн вывески и меню', costFormula: '8000', costValue: 8000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe5', contractorId: 'con6', description: 'Фрезеровка объёмных букв из ПВХ', costFormula: '=200*15', costValue: 3000, payerId: 'p1', paid: true, reconciled: true, note: '15 букв по 200р' },
      { id: 'oe6', contractorId: 'con1', description: 'Печать меню А4 ламинация 50 шт', costFormula: '=50*120', costValue: 6000, payerId: 'p2', paid: false, reconciled: false, note: '' },
      { id: 'oe7', contractorId: 'con2', description: 'Монтаж вывески', costFormula: '5000', costValue: 5000, payerId: 'p4', paid: true, reconciled: false, note: '' },
    ],
    saleAmount: 45000, paymentReceiverId: 'p1', paymentNote: 'Наличные', paymentReceived: true, status: 'active', note: 'Дизайн согласован', createdAt: d(Y, M, 5) + 'T11:00:00Z',
  },
  {
    id: 'o3', date: d(Y, M, 8), clientId: 'c4', productName: 'Оформление 3 филиалов (баннеры + плёнка)',
    contractors: [
      { id: 'oe8', contractorId: 'con3', description: 'Дизайн баннеров и оклейки', costFormula: '25000', costValue: 25000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe9', contractorId: 'con5', description: 'Печать баннеров 6 шт (3x2м)', costFormula: '=6*3*2*450', costValue: 16200, payerId: 'p2', paid: false, reconciled: false, note: '450 р/кв.м' },
      { id: 'oe10', contractorId: 'con5', description: 'Печать плёнки для стёкол', costFormula: '=12*800', costValue: 9600, payerId: '', paid: false, reconciled: false, note: '' },
      { id: 'oe11', contractorId: 'con2', description: 'Монтаж на 3 филиалах', costFormula: '=3*15000', costValue: 45000, payerId: 'p1', paid: false, reconciled: false, note: '' },
    ],
    saleAmount: 180000, paymentReceiverId: 'p2', paymentNote: 'Счёт №134', paymentReceived: false, status: 'active', note: 'Крупный заказ', createdAt: d(Y, M, 8) + 'T10:00:00Z',
  },
  {
    id: 'o4', date: d(Y, M, 10), clientId: 'c5', productName: 'Стенд для выставки "ИТ-Экспо"',
    contractors: [
      { id: 'oe12', contractorId: 'con3', description: 'Дизайн выставочного стенда', costFormula: '35000', costValue: 35000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe13', contractorId: 'con5', description: 'Печать панелей стенда', costFormula: '=8*2500+1500', costValue: 21500, payerId: 'p2', paid: true, reconciled: false, note: '' },
      { id: 'oe14', contractorId: 'con1', description: 'Каталоги A4 500 шт + визитки 1000 шт', costFormula: '=500*85+1000*3', costValue: 45500, payerId: 'p3', paid: true, reconciled: true, note: 'Клиент оплатил' },
      { id: 'oe15', contractorId: 'con8', description: 'Доставка на выставку', costFormula: '3500', costValue: 3500, payerId: 'p1', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 165000, paymentReceiverId: 'p3', paymentNote: 'Оплата клиентом напрямую', paymentReceived: true, status: 'active', note: 'Выставка 25-27 числа', createdAt: d(Y, M, 10) + 'T14:00:00Z',
  },
  {
    id: 'o5', date: d(Y, M, 12), clientId: 'c6', productName: 'Баннер на фасад автосалона 10x3м',
    contractors: [
      { id: 'oe16', contractorId: 'con3', description: 'Дизайн баннера', costFormula: '10000', costValue: 10000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe17', contractorId: 'con5', description: 'Печать баннера 10x3м', costFormula: '=10*3*550', costValue: 16500, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe18', contractorId: 'con2', description: 'Монтаж на фасад', costFormula: '18000', costValue: 18000, payerId: 'p4', paid: false, reconciled: false, note: '' },
    ],
    saleAmount: 75000, paymentReceiverId: 'p4', paymentNote: 'Карта директора *4523', paymentReceived: false, status: 'active', note: '', createdAt: d(Y, M, 12) + 'T09:30:00Z',
  },
  {
    id: 'o6', date: d(Y, M, 15), clientId: 'c7', productName: 'Дизайн и печать меню ресторана',
    contractors: [
      { id: 'oe19', contractorId: 'con3', description: 'Дизайн меню (16 стр, фотосъёмка)', costFormula: '=20000+15000', costValue: 35000, payerId: 'p2', paid: false, reconciled: false, note: 'Фотосъёмка блюд 15000' },
      { id: 'oe20', contractorId: 'con1', description: 'Печать меню 100 шт', costFormula: '=100*350', costValue: 35000, payerId: '', paid: false, reconciled: false, note: '' },
    ],
    saleAmount: 110000, paymentReceiverId: '', paymentNote: '', paymentReceived: false, status: 'active', note: 'Фотосъёмка 18 числа', createdAt: d(Y, M, 15) + 'T16:00:00Z',
  },
  {
    id: 'o7', date: d(Y, M, 1), clientId: 'c10', productName: 'Оклейка витрины цветочного магазина',
    contractors: [
      { id: 'oe21', contractorId: 'con3', description: 'Дизайн оклейки', costFormula: '5000', costValue: 5000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe22', contractorId: 'con5', description: 'Печать плёнки 4 кв.м', costFormula: '=4*900', costValue: 3600, payerId: 'p1', paid: true, reconciled: true, note: '' },
      { id: 'oe23', contractorId: 'con2', description: 'Оклейка витрины', costFormula: '3000', costValue: 3000, payerId: 'p1', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 25000, paymentReceiverId: 'p1', paymentNote: 'Наличные в кассу', paymentReceived: true, status: 'completed', note: 'Клиент доволен', createdAt: d(Y, M, 1) + 'T10:00:00Z',
  },
  {
    id: 'o8', date: d(Y, M, 3), clientId: 'c9', productName: 'Визитки + буклеты для клиники',
    contractors: [
      { id: 'oe24', contractorId: 'con3', description: 'Дизайн визиток и буклетов', costFormula: '7000', costValue: 7000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe25', contractorId: 'con1', description: 'Визитки 2000 шт + буклеты 500 шт', costFormula: '=2000*2.5+500*25', costValue: 17500, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe26', contractorId: 'con8', description: 'Доставка в клинику', costFormula: '1500', costValue: 1500, payerId: 'p5', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 42000, paymentReceiverId: 'p2', paymentNote: 'Р/с счёт №98', paymentReceived: true, status: 'completed', note: '', createdAt: d(Y, M, 3) + 'T11:00:00Z',
  },
  {
    id: 'o9', date: d(Y, M - 1, 5), clientId: 'c1', productName: 'Наружная реклама на щите 3x6м',
    contractors: [
      { id: 'oe27', contractorId: 'con3', description: 'Дизайн макета для щита', costFormula: '12000', costValue: 12000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe28', contractorId: 'con5', description: 'Печать баннера 3x6м', costFormula: '=3*6*500', costValue: 9000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe29', contractorId: 'con2', description: 'Монтаж', costFormula: '8000', costValue: 8000, payerId: 'p1', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 55000, paymentReceiverId: 'p2', paymentNote: 'Р/с', paymentReceived: true, status: 'completed', note: 'Щит на Ленинградском шоссе', createdAt: '2024-01-05T10:00:00Z',
  },
  {
    id: 'o10', date: d(Y, M - 1, 10), clientId: 'c3', productName: 'Баннеры на стройограждения (5 шт)',
    contractors: [
      { id: 'oe30', contractorId: 'con3', description: 'Дизайн баннеров', costFormula: '18000', costValue: 18000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe31', contractorId: 'con5', description: 'Печать 5 баннеров 2x3м', costFormula: '=5*2*3*480', costValue: 14400, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe32', contractorId: 'con2', description: 'Монтаж', costFormula: '=5*3000', costValue: 15000, payerId: 'p1', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 85000, paymentReceiverId: 'p1', paymentNote: 'Наличные', paymentReceived: true, status: 'completed', note: '', createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'o11', date: d(Y, M - 1, 15), clientId: 'c4', productName: 'Ролл-апы для фитнес-клуба (10 шт)',
    contractors: [
      { id: 'oe33', contractorId: 'con3', description: 'Дизайн ролл-апов', costFormula: '15000', costValue: 15000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe34', contractorId: 'con5', description: 'Печать + конструкции 10 шт', costFormula: '=10*3500', costValue: 35000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe35', contractorId: 'con8', description: 'Доставка по 5 адресам', costFormula: '=5*1200', costValue: 6000, payerId: 'p5', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 95000, paymentReceiverId: 'p2', paymentNote: 'Р/с', paymentReceived: true, status: 'completed', note: '', createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'o12', date: d(Y, M - 1, 20), clientId: 'c8', productName: 'Каталог мебели 48 стр + визитки',
    contractors: [
      { id: 'oe36', contractorId: 'con3', description: 'Дизайн каталога', costFormula: '=48*1500', costValue: 72000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe37', contractorId: 'con1', description: 'Печать каталога 1000 шт', costFormula: '=1000*180', costValue: 180000, payerId: 'p3', paid: true, reconciled: true, note: '' },
      { id: 'oe38', contractorId: 'con1', description: 'Визитки 5000 шт', costFormula: '=5000*2.5', costValue: 12500, payerId: 'p2', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 350000, paymentReceiverId: 'p3', paymentNote: 'Клиент оплатил типографии', paymentReceived: true, status: 'completed', note: 'Крупный заказ', createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'o13', date: d(Y, M - 2, 7), clientId: 'c6', productName: 'Неоновая вывеска автосалона',
    contractors: [
      { id: 'oe39', contractorId: 'con3', description: 'Дизайн неоновой вывески', costFormula: '12000', costValue: 12000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe40', contractorId: 'con4', description: 'Изготовление неоновой вывески', costFormula: '=65000+5000', costValue: 70000, payerId: 'p2', paid: true, reconciled: true, note: 'RGB контроллер' },
      { id: 'oe41', contractorId: 'con2', description: 'Монтаж вывески', costFormula: '15000', costValue: 15000, payerId: 'p4', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 150000, paymentReceiverId: 'p4', paymentNote: 'Карта директора', paymentReceived: true, status: 'completed', note: 'Гарантия 2 года', createdAt: '2024-01-07T10:00:00Z',
  },
  {
    id: 'o14', date: d(Y, M - 2, 14), clientId: 'c3', productName: 'Информационные стенды для стройплощадки',
    contractors: [
      { id: 'oe42', contractorId: 'con3', description: 'Дизайн 8 стендов', costFormula: '=8*3000', costValue: 24000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe43', contractorId: 'con5', description: 'Печать стендов на ПВХ', costFormula: '=8*4500', costValue: 36000, payerId: 'p2', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 96000, paymentReceiverId: 'p2', paymentNote: 'Р/с', paymentReceived: true, status: 'completed', note: '', createdAt: '2024-01-14T10:00:00Z',
  },
  {
    id: 'o15', date: d(Y, M - 2, 22), clientId: 'c7', productName: 'Брендирование доставки ресторана',
    contractors: [
      { id: 'oe44', contractorId: 'con3', description: 'Дизайн упаковки', costFormula: '20000', costValue: 20000, payerId: 'p2', paid: true, reconciled: true, note: '' },
      { id: 'oe45', contractorId: 'con1', description: 'Печать пакетов 5000 + коробки 2000', costFormula: '=5000*8+2000*15', costValue: 70000, payerId: 'p3', paid: true, reconciled: true, note: '' },
    ],
    saleAmount: 135000, paymentReceiverId: 'p2', paymentNote: 'Р/с', paymentReceived: true, status: 'completed', note: '', createdAt: '2024-01-22T10:00:00Z',
  },
  {
    id: 'o16', date: d(Y, M, 18), clientId: 'c3', productName: 'Рекламный щит на стройке',
    contractors: [
      { id: 'oe46', contractorId: 'con3', description: 'Дизайн щита', costFormula: '8000', costValue: 8000, payerId: 'p2', paid: false, reconciled: false, note: '' },
      { id: 'oe47', contractorId: 'con5', description: 'Печать 3x6м', costFormula: '=3*6*500', costValue: 9000, payerId: '', paid: false, reconciled: false, note: '' },
    ],
    saleAmount: 35000, paymentReceiverId: '', paymentNote: '', paymentReceived: false, status: 'active', note: 'Кутузовский проспект', createdAt: d(Y, M, 18) + 'T10:00:00Z',
  },
  {
    id: 'o17', date: d(Y, M, 20), clientId: 'c9', productName: 'Световая вывеска "Здоровье+"',
    contractors: [
      { id: 'oe48', contractorId: 'con3', description: 'Дизайн вывески', costFormula: '10000', costValue: 10000, payerId: 'p2', paid: false, reconciled: false, note: '' },
      { id: 'oe49', contractorId: 'con4', description: 'Изготовление светового короба', costFormula: '38000', costValue: 38000, payerId: 'p2', paid: false, reconciled: false, note: '' },
      { id: 'oe50', contractorId: 'con2', description: 'Монтаж', costFormula: '10000', costValue: 10000, payerId: 'p1', paid: false, reconciled: false, note: '' },
    ],
    saleAmount: 95000, paymentReceiverId: 'p2', paymentNote: 'Ожидаем счёт', paymentReceived: false, status: 'active', note: 'Согласование с УК', createdAt: d(Y, M, 20) + 'T12:00:00Z',
  },
  {
    id: 'o18', date: d(Y, M, 22), clientId: 'c5', productName: 'Landing page + контекстная реклама',
    contractors: [
      { id: 'oe51', contractorId: 'con7', description: 'Разработка лендинга', costFormula: '45000', costValue: 45000, payerId: 'p2', paid: false, reconciled: false, note: '' },
      { id: 'oe52', contractorId: 'con7', description: 'Настройка Яндекс.Директ', costFormula: '20000', costValue: 20000, payerId: 'p5', paid: false, reconciled: false, note: '' },
    ],
    saleAmount: 110000, paymentReceiverId: 'p2', paymentNote: 'Счёт №145', paymentReceived: false, status: 'active', note: 'Лендинг для нового продукта', createdAt: d(Y, M, 22) + 'T11:00:00Z',
  },
];
