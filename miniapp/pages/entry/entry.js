const api = require('../../services/api');
const { formatDate, showToast, showLoading, hideLoading, showConfirm } = require('../../utils/util');
const { isLoggedIn } = require('../../utils/auth');

// 预设采购单位
const UNITS = ['斤', '公斤', '个', '箱', '捆', '袋', '包', '瓶', '桶', '把', '只', '条', '份', '盘', '件', '套'];

// 支出类别选项
const EXPENSE_CATEGORIES = ['房租', '水电费', '煤气费', '维修', '办公用品', '交通费', '卫生用品', '其他'];

Page({
  data: {
    // Tab
    activeTab: 'income', // income | purchase | expense

    // ===== 收入录入 =====
    channels: [],
    channelInputs: {},   // { channelId: amount }
    revenueDate: formatDate(),
    revenueSubmitting: false,

    // ===== 采购录入 =====
    purchaseSupplier: '',
    purchaseProduct: '',
    purchaseQuantity: '',
    purchaseUnitIndex: 0,
    purchaseUnitPrice: '',
    purchaseTotalAmount: '',
    purchaseDate: formatDate(),
    purchaseMemo: '',
    purchaseSubmitting: false,
    units: UNITS,
    supplierList: [],
    productList: [],

    // ===== 支出录入 =====
    expenseCategory: '',
    expenseAmount: '',
    expenseDate: formatDate(),
    expenseDescription: '',
    expenseSubmitting: false,
    expenseCategories: EXPENSE_CATEGORIES,
  },

  onShow() {
    if (!isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    // 检查导航意图
    const entryTab = wx.getStorageSync('entry_tab');
    if (entryTab && ['income', 'purchase', 'expense'].includes(entryTab)) {
      this.setData({ activeTab: entryTab });
      wx.removeStorageSync('entry_tab');
    }
    this.loadChannels();
  },

  // ========== Tab 切换 ==========
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
    if (tab === 'purchase') {
      this.loadSuppliersAndProducts();
    }
  },

  // ========== 数据加载 ==========
  async loadChannels() {
    try {
      const channels = await api.get('/revenue-channels');
      this.setData({ channels });
    } catch (err) {
      console.error('Load channels error:', err);
    }
  },

  async loadSuppliersAndProducts() {
    try {
      const [suppliers, products] = await Promise.all([
        api.get('/suppliers', { pageSize: 100 }).catch(() => ({ items: [] })),
        api.get('/products', { pageSize: 100 }).catch(() => ({ items: [] })),
      ]);
      this.setData({
        supplierList: suppliers.items || [],
        productList: products.items || [],
      });
    } catch (err) {
      console.error('Load data error:', err);
    }
  },

  // ========== 收入录入 ==========
  onRevenueDateChange(e) {
    this.setData({ revenueDate: e.detail.value });
  },

  onChannelAmountInput(e) {
    const { channelId } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`channelInputs.${channelId}`]: value,
    });
  },

  async onSubmitRevenue() {
    const { channels, channelInputs, revenueDate } = this.data;
    const items = channels
      .map((ch) => ({
        channelId: ch.id,
        amount: parseFloat(channelInputs[ch.id]) || 0,
      }))
      .filter((item) => item.amount > 0);

    if (items.length === 0) {
      showToast('请至少录入一条收入金额');
      return;
    }

    this.setData({ revenueSubmitting: true });
    try {
      const result = await api.post('/daily-revenue/batch', {
        revenueDate,
        items,
      });
      showToast(`成功录入 ${result.count} 条收入`, 'success');
      // 清空输入
      this.setData({ channelInputs: {}, revenueSubmitting: false });
      // 刷新仪表盘数据提示
      wx.setStorageSync('need_refresh', true);
    } catch (err) {
      showToast(err.message || '录入失败');
      this.setData({ revenueSubmitting: false });
    }
  },

  // ========== 采购录入 ==========
  onPurchaseSupplierInput(e) { this.setData({ purchaseSupplier: e.detail.value }); },
  onPurchaseProductInput(e) { this.setData({ purchaseProduct: e.detail.value }); },
  onPurchaseQuantityInput(e) {
    const qty = parseFloat(e.detail.value) || 0;
    const unitPrice = parseFloat(this.data.purchaseUnitPrice) || 0;
    if (qty > 0 && unitPrice > 0) {
      this.setData({
        purchaseQuantity: e.detail.value,
        purchaseTotalAmount: String((qty * unitPrice).toFixed(2)),
      });
    } else {
      this.setData({ purchaseQuantity: e.detail.value });
    }
  },

  onPurchaseUnitPriceInput(e) {
    const unitPrice = parseFloat(e.detail.value) || 0;
    const qty = parseFloat(this.data.purchaseQuantity) || 0;
    if (qty > 0 && unitPrice > 0) {
      this.setData({
        purchaseUnitPrice: e.detail.value,
        purchaseTotalAmount: String((qty * unitPrice).toFixed(2)),
      });
    } else {
      this.setData({ purchaseUnitPrice: e.detail.value });
    }
  },

  onPurchaseTotalAmountInput(e) { this.setData({ purchaseTotalAmount: e.detail.value }); },
  onPurchaseUnitChange(e) { this.setData({ purchaseUnitIndex: e.detail.value }); },
  onPurchaseDateChange(e) { this.setData({ purchaseDate: e.detail.value }); },
  onPurchaseMemoInput(e) { this.setData({ purchaseMemo: e.detail.value }); },

  async onSubmitPurchase() {
    const { purchaseSupplier, purchaseProduct, purchaseQuantity, purchaseTotalAmount,
            purchaseDate, purchaseMemo, units, purchaseUnitIndex } = this.data;

    if (!purchaseSupplier.trim()) return showToast('请输入供应商名称');
    if (!purchaseProduct.trim()) return showToast('请输入商品名称');
    const totalAmount = parseFloat(purchaseTotalAmount);
    if (!totalAmount || totalAmount <= 0) return showToast('请输入有效的总金额');

    this.setData({ purchaseSubmitting: true });
    try {
      // 供应商和商品名称先传给后端，后端自动查找或创建
      await api.post('/purchases', {
        supplierId: purchaseSupplier.trim(),
        productId: purchaseProduct.trim(),
        unit: units[purchaseUnitIndex],
        quantity: purchaseQuantity ? parseFloat(purchaseQuantity) : 0,
        unitPrice: purchaseTotalAmount && purchaseQuantity
          ? parseFloat((totalAmount / parseFloat(purchaseQuantity)).toFixed(2))
          : 0,
        totalAmount,
        purchaseDate,
        inputMethod: 'manual',
        memo: purchaseMemo || undefined,
      });
      showToast('采购记录添加成功', 'success');
      this.setData({
        purchaseSupplier: '', purchaseProduct: '', purchaseQuantity: '',
        purchaseUnitPrice: '', purchaseTotalAmount: '', purchaseMemo: '',
        purchaseSubmitting: false,
      });
    } catch (err) {
      showToast(err.message || '录入失败');
      this.setData({ purchaseSubmitting: false });
    }
  },

  // ========== 支出录入 ==========
  onExpenseCategoryInput(e) { this.setData({ expenseCategory: e.detail.value }); },
  onExpenseAmountInput(e) { this.setData({ expenseAmount: e.detail.value }); },
  onExpenseDateChange(e) { this.setData({ expenseDate: e.detail.value }); },
  onExpenseDescInput(e) { this.setData({ expenseDescription: e.detail.value }); },

  onExpenseCategorySelect(e) {
    const { cat } = e.currentTarget.dataset;
    this.setData({ expenseCategory: cat });
  },

  async onSubmitExpense() {
    const { expenseCategory, expenseAmount, expenseDate, expenseDescription } = this.data;
    if (!expenseCategory.trim()) return showToast('请输入支出类别');
    const amount = parseFloat(expenseAmount);
    if (!amount || amount <= 0) return showToast('请输入有效的金额');

    this.setData({ expenseSubmitting: true });
    try {
      await api.post('/expenses', {
        category: expenseCategory.trim(),
        amount,
        expenseDate,
        description: expenseDescription || undefined,
      });
      showToast('支出记录添加成功', 'success');
      this.setData({
        expenseCategory: '', expenseAmount: '', expenseDescription: '',
        expenseSubmitting: false,
      });
    } catch (err) {
      showToast(err.message || '录入失败');
      this.setData({ expenseSubmitting: false });
    }
  },
});
