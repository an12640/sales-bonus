/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // Расчет выручки от операции
  const discount = 1 - purchase.discount / 100;
  return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // Расчет бонуса от позиции в рейтинге
  if (index === 0) {
    return seller.profit * 0.15;
  } else if (index === 1 || index === 2) {
    return seller.profit * 0.1;
  } else if (index === total - 1) {
    return 0;
  } else {
    return seller.profit * 0.05;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.customers) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.customers.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  // Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options;
  if (!calculateRevenue || !calculateBonus) {
    throw new Error("Чего-то не хватает");
  }

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Переменная не является функцией");
  }

  // Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
    bonus: 0,
  }));
  // Заполним начальными данными

  // Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => [seller.id, seller])
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product])
  );

  // Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    // Чек
    const sellerStat = sellerIndex[record.seller_id]; // Продавец
    // Увеличить количество продаж
    sellerStat.sales_count += 1;
    // Увеличить общую сумму всех продаж
    sellerStat.revenue += record["total_amount"];

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар
      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const cost = product.purchase_price * item.quantity;
      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const revenue = calculateSimpleRevenue(item, product);
      // Посчитать прибыль: выручка минус себестоимость
      const profit = revenue - cost;
      // Увеличить общую накопленную прибыль (profit) у продавца
      sellerStat.profit += profit;

      // Учёт количества проданных товаров
      if (!sellerStat.products_sold[item.sku]) {
        sellerStat.products_sold[item.sku] = 0;
      }
      // По артикулу товара увеличить его проданное количество у продавца
      sellerStat.products_sold[item.sku] += item.quantity;
    });
  });

  // Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
    seller.top_products = Object.entries(seller.products_sold).map(
      ([sku, quantity]) => ({ sku, quantity })
    ); // Формируем топ-10 товаров
    seller.top_products = seller.top_products
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count, // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
  }));
}
