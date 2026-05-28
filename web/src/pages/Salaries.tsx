import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, InputNumber, DatePicker, Input, Popconfirm, message, Space, Tag, Card, Statistic, Row, Col, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import api from '../services/api';

const CALC_BASE = 30;

function calcNetSalary(baseSalary: number, absentDays: number, fullAttendanceBonus: number, bonus: number, deduction: number): number {
  const actualBonus = absentDays === 0 ? fullAttendanceBonus : 0;
  const adjustment = baseSalary / CALC_BASE * (2 - absentDays);
  return Math.round((baseSalary + adjustment + actualBonus + bonus - deduction) * 100) / 100;
}

export default function SalariesPage() {
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [selectedBaseSalary, setSelectedBaseSalary] = useState(0);
  const [selectedHireDate, setSelectedHireDate] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Year/month filter
  const now = dayjs();
  const [filterYear, setFilterYear] = useState<number>(now.year());
  const [filterMonth, setFilterMonth] = useState<number>(now.month() + 1);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: any = { pageSize: 200 };
    if (filterMonth === 0) {
      params.payDateStart = dayjs(`${filterYear}-01-01`).startOf('year').format('YYYY-MM-DD');
      params.payDateEnd = dayjs(`${filterYear}-12-31`).endOf('year').format('YYYY-MM-DD');
    } else {
      params.payDateStart = dayjs(`${filterYear}-${String(filterMonth).padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
      params.payDateEnd = dayjs(`${filterYear}-${String(filterMonth).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
    }

    Promise.all([
      api.get('/salaries', { params }),
      api.get('/employees', { params: { isActive: true, pageSize: 200 } }),
    ]).then(([s, e]) => {
      setData(s.data);
      setEmployees(e.data.items);
    }).catch(() => {
      message.error('加载工资数据失败');
    }).finally(() => setLoading(false));
  }, [filterYear, filterMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Cleanup form state after modal closes (runs after Form exits validating state)
  useEffect(() => {
    if (!modalOpen) {
      form.resetFields();
      setEditing(null);
      setSelectedBaseSalary(0);
      setSelectedHireDate(null);
    }
  }, [modalOpen]);

  // Recalculate net salary whenever relevant fields change
  const handleFormChange = () => {
    const values = form.getFieldsValue();
    const baseSalary = values._auto_baseSalary || 0;
    const absentDays = values.attendance_absentDays || 0;
    const fullAttendanceBonus = values.attendance_fullAttendanceBonus || 0;
    const bonus = values.bonus || 0;
    const deduction = values.deduction || 0;

    if (baseSalary > 0) {
      const net = calcNetSalary(baseSalary, absentDays, fullAttendanceBonus, bonus, deduction);
      form.setFieldsValue({ netSalary: net });
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const emp = employees.find((e: any) => e.id === employeeId);
    if (emp) {
      setSelectedBaseSalary(emp.baseSalary);
      setSelectedHireDate(emp.hireDate);
      form.setFieldsValue({
        _auto_baseSalary: emp.baseSalary,
        baseSalaryDisplay: emp.baseSalary,
      });

      // Auto-fill period dates based on filter month + employee's scheduledPayDay
      const payDay = emp.scheduledPayDay || 1;
      const effectiveMonth = filterMonth === 0 ? dayjs().month() + 1 : filterMonth;
      const effectiveYear = filterMonth === 0 ? dayjs().year() : filterYear;
      const prevMonth = effectiveMonth - 1;
      const prevYear = prevMonth > 0 ? effectiveYear : effectiveYear - 1;
      const prevMonthNum = prevMonth > 0 ? prevMonth : 12;

      const periodStart = dayjs(`${prevYear}-${String(prevMonthNum).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`);
      const periodEnd = dayjs(`${effectiveYear}-${String(effectiveMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`);

      form.setFieldsValue({
        periodStart,
        periodEnd,
        actualPayDate: periodEnd,
        attendance_fullAttendanceBonus: 200,
      });
      setTimeout(handleFormChange, 50);
    }
  };

  const handleSubmit = async (values: any) => {
    const attendanceStatus = {
      absentDays: values.attendance_absentDays || 0,
      fullAttendanceBonus: values.attendance_fullAttendanceBonus || 0,
    };

    const payload: any = {
      employeeId: values.employeeId,
      periodStart: values.periodStart.format('YYYY-MM-DD'),
      periodEnd: values.periodEnd.format('YYYY-MM-DD'),
      bonus: values.bonus || 0,
      deduction: values.deduction || 0,
      attendanceStatus,
      memo: values.memo || null,
    };

    if (values.actualPayDate) {
      payload.actualPayDate = values.actualPayDate.format('YYYY-MM-DD');
    }

    try {
      if (editing) {
        await api.put(`/salaries/${editing}`, payload);
        message.success('工资记录已更新');
      } else {
        await api.post('/salaries', payload);
        message.success('工资记录已添加');
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      const detail = err.response?.data?.field ? ` (${err.response.data.field})` : '';
      message.error((err.response?.data?.error || '操作失败') + detail);
    }
  };

  const handleMarkPaid = async (id: string) => {
    await api.patch(`/salaries/${id}/pay`);
    message.success('已标记发放');
    fetchData();
  };

  const handleUnmarkPaid = async (id: string) => {
    try {
      await api.patch(`/salaries/${id}/unpay`);
      message.success('已撤销为待发放');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || '撤销失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/salaries/${id}`);
      message.success('已删除');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const handleExportExcel = () => {
    if (data.items.length === 0) {
      message.warning('当前筛选条件下无数据可导出');
      return;
    }
    const headers = ['姓名', '身份证号', '手机号', '实发工资金额'];
    const rows = data.items.map((r: any) => [
      r.employee?.name || '',
      r.employee?.idCardNumber || '',
      r.employee?.phone || '',
      r.netSalary,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 22 },
      { wch: 15 },
      { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '工资发放');
    const ts = dayjs().format('YYYYMMDD_HHmmss');
    XLSX.writeFile(wb, `工资发放_${ts}.xlsx`);
    message.success('导出成功');
  };

  const handleEdit = (record: any) => {
    setEditing(record.id);
    const emp = employees.find((e: any) => e.id === record.employeeId);
    const att = typeof record.attendanceStatus === 'string'
      ? JSON.parse(record.attendanceStatus)
      : (record.attendanceStatus || {});

    form.setFieldsValue({
      employeeId: record.employeeId,
      _auto_baseSalary: emp?.baseSalary || record.baseSalary,
      baseSalaryDisplay: emp?.baseSalary || record.baseSalary,
      periodStart: dayjs(record.periodStart),
      periodEnd: dayjs(record.periodEnd),
      bonus: record.bonus,
      deduction: record.deduction,
      attendance_absentDays: att.absentDays ?? 0,
      attendance_fullAttendanceBonus: att.fullAttendanceBonus ?? 0,
      netSalary: record.netSalary,
      actualPayDate: record.actualPayDate ? dayjs(record.actualPayDate) : null,
      memo: record.memo,
    });
    setSelectedBaseSalary(emp?.baseSalary || record.baseSalary);
    setSelectedHireDate(emp?.hireDate || record.hireDate);
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setEditing(null);
    setSelectedBaseSalary(0);
    setSelectedHireDate(null);
    form.resetFields();
    form.setFieldsValue({
      bonus: 0,
      deduction: 0,
      attendance_absentDays: 0,
      attendance_fullAttendanceBonus: 0,
      periodStart: dayjs().startOf('month'),
      periodEnd: dayjs().endOf('month'),
    });
    setModalOpen(true);
  };

  const totalPaid = data.items.filter((r: any) => r.payStatus === 'paid').reduce((s: number, r: any) => s + Number(r.netSalary), 0);
  const totalPending = data.items.filter((r: any) => r.payStatus === 'pending').reduce((s: number, r: any) => s + Number(r.netSalary), 0);

  const parseAttendance = (record: any) => {
    const att = typeof record.attendanceStatus === 'string'
      ? JSON.parse(record.attendanceStatus)
      : (record.attendanceStatus || {});
    return { absentDays: att.absentDays ?? 0, fullAttendanceBonus: att.fullAttendanceBonus ?? 0 };
  };

  const columns = [
    { title: '员工', dataIndex: 'employee', render: (e: any) => e?.name, width: 80 },
    {
      title: '工资周期', key: 'period', width: 170,
      render: (_: any, r: any) => `${dayjs(r.periodStart).format('MM/DD')} ~ ${dayjs(r.periodEnd).format('MM/DD')}`,
    },
    { title: '基本工资', dataIndex: 'baseSalary', width: 100, render: (v: any) => `¥${Number(v).toLocaleString()}` },
    {
      title: '不在岗', key: 'absent', width: 70,
      render: (_: any, r: any) => {
        const { absentDays } = parseAttendance(r);
        return absentDays > 0 ? <Tag color="error">{absentDays}天</Tag> : <Tag color="green">0天</Tag>;
      },
    },
    {
      title: '全勤奖', key: 'fullBonus', width: 90,
      render: (_: any, r: any) => {
        const { fullAttendanceBonus, absentDays } = parseAttendance(r);
        return absentDays === 0 && fullAttendanceBonus > 0 ? `¥${Number(fullAttendanceBonus).toLocaleString()}` : '-';
      },
    },
    { title: '奖金', dataIndex: 'bonus', width: 80, render: (v: any) => Number(v) > 0 ? `¥${Number(v).toLocaleString()}` : '-' },
    { title: '扣款', dataIndex: 'deduction', width: 80, render: (v: any) => Number(v) > 0 ? <span style={{ color: '#cf1322' }}>¥{Number(v).toLocaleString()}</span> : '-' },
    {
      title: '实发工资', dataIndex: 'netSalary', width: 110,
      render: (v: any) => <span style={{ fontWeight: 600 }}>¥{Number(v).toLocaleString()}</span>,
    },
    {
      title: '入职日期', dataIndex: 'hireDate', width: 100,
      render: (v: any) => v ? dayjs(v).format('YYYY/MM/DD') : '-',
    },
    {
      title: '发放日期', dataIndex: 'actualPayDate', width: 110,
      render: (v: any) => v ? dayjs(v).format('MM/DD') : <span style={{ color: '#999' }}>-</span>,
    },
    { title: '状态', dataIndex: 'payStatus', width: 100,
      render: (v: string, record: any) => (
        v === 'paid'
          ? <Tag color="green">已发放</Tag>
          : (
            <Popconfirm title="确认已发放?" onConfirm={() => handleMarkPaid(record.id)}>
              <Tag color="orange" style={{ cursor: 'pointer' }}>待发放</Tag>
            </Popconfirm>
          )
      ),
    },
    {
      title: '操作', width: 200, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          {record.payStatus === 'pending' && (
            <>
              <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
              <Popconfirm title="确认已发放?" onConfirm={() => handleMarkPaid(record.id)}>
                <Button type="link" size="small" style={{ color: '#52c41a' }}>发放</Button>
              </Popconfirm>
              <Popconfirm title="确认删除此工资记录?" onConfirm={() => handleDelete(record.id)}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </>
          )}
          {record.payStatus === 'paid' && (
            <Popconfirm title="确认撤销为待发放?" onConfirm={() => handleUnmarkPaid(record.id)}>
              <Button type="link" size="small" style={{ color: '#faad14' }}>撤销</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Generate year options (2 years back, 1 year forward)
  const yearOptions = [];
  for (let y = now.year() - 2; y <= now.year() + 1; y++) {
    yearOptions.push({ label: `${y}年`, value: y });
  }
  const monthOptions = [
    { label: '全年', value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 })),
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>工资管理</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card hoverable size="small">
            <Statistic title="已发放" value={totalPaid} precision={2} prefix="¥" valueStyle={{ color: '#52c41a', fontWeight: 600, fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card hoverable size="small">
            <Statistic title="待发放" value={totalPending} precision={2} prefix="¥" valueStyle={{ color: '#faad14', fontWeight: 600, fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card hoverable size="small">
            <Statistic title="工资总和" value={totalPaid + totalPending} precision={2} prefix="¥" valueStyle={{ fontWeight: 600, fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card hoverable size="small">
            <Statistic title="记录数" value={data.total} valueStyle={{ fontWeight: 600, fontSize: 20 }} />
          </Card>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <span style={{ color: '#666', fontSize: 13 }}>筛选月份：</span>
          <Select value={filterYear} onChange={(v) => setFilterYear(v)} options={yearOptions} style={{ width: 90 }} />
          <Select value={filterMonth} onChange={(v) => setFilterMonth(v)} options={monthOptions} style={{ width: 80 }} />
          <Button icon={<SearchOutlined />} onClick={fetchData}>查询</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>导出Excel</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新增工资记录</Button>
      </div>

      <Table columns={columns} dataSource={data.items} rowKey="id" loading={loading} size="small"
        scroll={{ x: 1400 }} pagination={{ pageSize: 50, showTotal: (t: number) => `共 ${t} 条` }}
        footer={() => {
          const totalNet = data.items.reduce((s: number, r: any) => s + Number(r.netSalary), 0);
          return (
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#D4A574' }}>
              实发工资合计：¥{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          );
        }}
      />

      <Modal
        title={editing ? '编辑工资记录' : '新增工资记录'}
        open={modalOpen}
        width={560}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={handleFormChange}>
          <Form.Item name="employeeId" label="员工" rules={[{ required: true, message: '请选择员工' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择员工"
              disabled={!!editing}
              onChange={handleEmployeeSelect}
              options={employees.map((e: any) => ({
                label: `${e.name} (${e.position === 'chef' ? '厨师' : e.position === 'waiter' ? '服务员' : e.position === 'cashier' ? '收银' : e.position === 'cleaner' ? '杂工' : e.position === 'manager' ? '经理' : e.position}) 基本工资¥${Number(e.baseSalary).toLocaleString()}`,
                value: e.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="periodStart" label="工资周期开始" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="periodEnd" label="工资周期结束" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ display: 'none' }} name="_auto_baseSalary">
            <InputNumber />
          </Form.Item>

          <Card size="small" style={{ marginBottom: 16, background: '#faf8f5' }}>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>基本工资</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#D4A574' }}>
                  ¥{Number(selectedBaseSalary || 0).toLocaleString()}
                </div>
              </Col>
              <Col span={8}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>入职日期</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#5c5c5c' }}>
                  {selectedHireDate ? dayjs(selectedHireDate).format('YYYY/MM/DD') : <span style={{ color: '#bbb' }}>请先选择员工</span>}
                </div>
              </Col>
              <Col span={8}>
                <Form.Item name="netSalary" label="实发工资（自动计算）" style={{ marginBottom: 0 }}>
                  <InputNumber style={{ width: '100%' }} prefix="¥" disabled
                    formatter={(v) => Number(v).toLocaleString()} />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ color: '#999', fontSize: 11, marginTop: 8 }}>
              公式：基本工资 + 基本工资/30×(2-不在岗天数) + 全勤奖 + 奖金 - 扣款
            </div>
          </Card>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="attendance_absentDays" label="不在岗天数" initialValue={0}>
                <InputNumber min={0} max={30} step={0.5} style={{ width: '100%' }} suffix="天" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="attendance_fullAttendanceBonus" label="全勤奖" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bonus" label="奖金" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deduction" label="扣款" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="actualPayDate" label="实发工资日期">
                <DatePicker style={{ width: '100%' }} placeholder="选择实际发放日期" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="memo" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
