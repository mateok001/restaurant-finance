const api = require('../../services/api');
const { formatDate, formatMoney, showToast } = require('../../utils/util');
const { isLoggedIn } = require('../../utils/auth');

Page({
  data: {
    periodType: 'month',  // today | week | month | custom
    startDate: '',
    endDate: '',
    loading: false,

    // 汇总数据
    totalRevenue: 0,
    totalPurchase: 0,
    totalExpense: 0,
    totalProfit: 0,
    revenueText: '',
    purchaseText: '',
    expenseText: '',
    profitText: '',

    // 趋势
    trends: [],
    trendLabels: [],
    trendRevenue: [],
    trendExpense: [],
    trendProfit: [],
  },

  onShow() {
    if (!isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.initDates();
    this.loadReport();
  },

  initDates() {
    const now = new Date();
    const today = formatDate(now);
    let startDate = '';
    let endDate = today;

    switch (this.data.periodType) {
      case 'today':
        startDate = today;
        break;
      case 'week': {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = formatDate(d);
        break;
      }
      case 'month': {
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      }
      default:
        break;
    }
    this.setData({ startDate, endDate });
  },

  onPeriodChange(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ periodType: type }, () => {
      this.initDates();
      this.loadReport();
    });
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value }, () => this.loadReport());
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value }, () => this.loadReport());
  },

  async loadReport() {
    const { startDate, endDate } = this.data;
    if (!startDate || !endDate) return;

    this.setData({ loading: true });
    try {
      // 并行加载：汇总 + 每日收入 + 采购 + 支出
      const [dailyRevenue, purchasesRes, expensesRes] = await Promise.all([
        api.get('/daily-revenue', { startDate, endDate, pageSize: 500 }),
        api.get('/purchases', { startDate, endDate, pageSize: 500 }),
        api.get('/expenses', { startDate, endDate, pageSize: 500 }),
      ]);

      const totalRevenue = (dailyRevenue.items || []).reduce((sum, r) => sum + r.amount, 0);
      const totalPurchase = (purchasesRes.items || []).reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const totalExpense = (expensesRes.items || []).reduce((sum, e) => sum + e.amount, 0);
      const totalProfit = totalRevenue - totalPurchase - totalExpense;

      // 按日聚合趋势
      const trendMap = {};
      (dailyRevenue.items || []).forEach((r) => {
        const day = (r.revenueDate || '').slice(0, 10);
        if (!trendMap[day]) trendMap[day] = { revenue: 0, purchase: 0, expense: 0 };
        trendMap[day].revenue += r.amount;
      });
      (purchasesRes.items || []).forEach((p) => {
        const day = (p.purchaseDate || '').slice(0, 10);
        if (!trendMap[day]) trendMap[day] = { revenue: 0, purchase: 0, expense: 0 };
        trendMap[day].purchase += p.totalAmount || 0;
      });
      (expensesRes.items || []).forEach((e) => {
        const day = (e.expenseDate || '').slice(0, 10);
        if (!trendMap[day]) trendMap[day] = { revenue: 0, purchase: 0, expense: 0 };
        trendMap[day].expense += e.amount;
      });

      const days = Object.keys(trendMap).sort();

      this.setData({
        totalRevenue,
        totalPurchase,
        totalExpense,
        totalProfit,
        revenueText: formatMoney(totalRevenue),
        purchaseText: formatMoney(totalPurchase),
        expenseText: formatMoney(totalExpense),
        profitText: formatMoney(totalProfit),
        trendLabels: days,
        trendRevenue: days.map((d) => trendMap[d].revenue),
        trendExpense: days.map((d) => trendMap[d].expense + trendMap[d].purchase),
        trendProfit: days.map((d) => trendMap[d].revenue - trendMap[d].purchase - trendMap[d].expense),
        barHeights: days.map((d) => {
          const profit = trendMap[d].revenue - trendMap[d].purchase - trendMap[d].expense;
          const maxAbs = Math.max(1, ...days.map((dd) =>
            Math.abs(trendMap[dd].revenue - trendMap[dd].purchase - trendMap[dd].expense)
          ));
          return Math.max(8, Math.abs(profit) / maxAbs * 200);
        }),
        loading: false,
      });
    } catch (err) {
      console.error('Report load error:', err);
      showToast('加载报表失败');
      this.setData({ loading: false });
    }
  },
});
