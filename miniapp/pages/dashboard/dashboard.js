const api = require('../../services/api');
const { formatMoney, formatDate } = require('../../utils/util');
const { isLoggedIn } = require('../../utils/auth');
const app = getApp();

Page({
  data: {
    todayRevenueText: '¥0.00',
    monthRevenueText: '¥0.00',
    monthPurchaseText: '¥0.00',
    monthExpenseText: '¥0.00',
    monthProfitText: '¥0.00',
    monthProfit: 0,
    todayDate: '',
    recentItems: [],
    loading: true,
    userName: '',
  },

  onShow() {
    if (!isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ userName: app.globalData.userInfo?.displayName || '' });
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const today = require('../../utils/util').formatDate();
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const todayEnd = today;
      const todayStart = today;

      // 并行加载：今日收入、本月收入、本月采购、本月支出、趋势数据
      const [dailyRevenue, monthRevenueRes, purchasesRes, expensesRes, summaryRes] =
        await Promise.all([
          api.get('/daily-revenue', { startDate: todayStart, endDate: todayEnd, pageSize: 100 }),
          api.get('/daily-revenue', { startDate: monthStart, endDate: todayEnd, pageSize: 500 }),
          api.get('/purchases', { startDate: monthStart, endDate: todayEnd, pageSize: 500 }),
          api.get('/expenses', { startDate: monthStart, endDate: todayEnd, pageSize: 500 }),
          api.get('/reports/summary', { startDate: monthStart, endDate: todayEnd }).catch(() => null),
        ]);

      // 今日收入
      const todayTotal = (dailyRevenue.items || []).reduce((sum, r) => sum + r.amount, 0);
      // 本月收入
      const monthTotal = (monthRevenueRes.items || []).reduce((sum, r) => sum + r.amount, 0);
      // 本月采购
      const purchaseTotal = (purchasesRes.items || []).reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      // 本月支出
      const expenseTotal = (expensesRes.items || []).reduce((sum, e) => sum + e.amount, 0);
      // 净利润
      const profit = monthTotal - purchaseTotal - expenseTotal;

      // 最近记录
      const recent = [
        ...(dailyRevenue.items || []).slice(0, 3).map((r) => ({
          ...r,
          _type: 'revenue',
          _title: r.channel?.name || '收入',
          _amount: `+${formatMoney(r.amount)}`,
          _color: 'success',
          _date: r.revenueDate?.slice(0, 10),
        })),
        ...(purchasesRes.items || []).slice(0, 3).map((p) => ({
          ...p,
          _type: 'purchase',
          _title: p.product?.name || '采购',
          _amount: `-${formatMoney(p.totalAmount)}`,
          _color: 'warning',
          _date: p.purchaseDate?.slice(0, 10),
        })),
        ...(expensesRes.items || []).slice(0, 3).map((e) => ({
          ...e,
          _type: 'expense',
          _title: e.category || '支出',
          _amount: `-${formatMoney(e.amount)}`,
          _color: 'danger',
          _date: e.expenseDate?.slice(0, 10),
        })),
      ].sort((a, b) => (b._date || '').localeCompare(a._date || '')).slice(0, 8);

      this.setData({
        todayRevenueText: formatMoney(todayTotal),
        monthRevenueText: formatMoney(monthTotal),
        monthPurchaseText: formatMoney(purchaseTotal),
        monthExpenseText: formatMoney(expenseTotal),
        monthProfitText: formatMoney(profit),
        monthProfit: profit,
        todayDate: formatDate(),
        recentItems: recent,
        loading: false,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
      this.setData({ loading: false });
    }
  },

  onNavigateToEntry(e) {
    const { type } = e.currentTarget.dataset;
    wx.switchTab({ url: '/pages/entry/entry' });
    // 存储导航意图
    wx.setStorageSync('entry_tab', type || 'income');
  },
});
