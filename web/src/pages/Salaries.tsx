import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, InputNumber, DatePicker, Input, Popconfirm, message, Space, Tag, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

export default function SalariesPage() {
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/salaries', { params: { pageSize: 100 } }),
      api.get('/employees', { params: { isActive: true, pageSize: 200 } }),
    ]).then(([s, e]) => {
      setData(s.data);
      setEmployees(e.data.items);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      periodStart: values.periodStart.format('YYYY-MM-DD'),
      periodEnd: values.periodEnd.format('YYYY-MM-DD'),
      scheduledPayDate: values.scheduledPayDate.format('YYYY-MM-DD'),
      attendanceStatus: {
        fullAttendance: values.attendance_full ?? true,
        workDays: values.attendance_workDays ?? 0,
        lateDays: values.attendance_lateDays ?? 0,
        absentDays: values.attendance_absentDays ?? 0,
        leaveDays: values.attendance_leaveDays ?? 0,
      },
    };
    delete payload.attendance_full;
    delete payload.attendance_workDays;
    delete payload.attendance_lateDays;
    delete payload.attendance_absentDays;
    delete payload.attendance_leaveDays;

    if (editing) {
      await api.put(`/salaries/${editing}`, payload);
      message.success('更新成功');
    } else {
      await api.post('/salaries', payload);
      message.success('添加成功');
    }
    setModalOpen(false); setEditing(null); form.resetFields(); fetchData();
  };

  const handleBatchCreate = async (values: any) => {
    await api.post('/salaries/batch', {
      periodStart: values.periodStart.format('YYYY-MM-DD'),
      periodEnd: values.periodEnd.format('YYYY-MM-DD'),
      scheduledPayDate: values.scheduledPayDate.format('YYYY-MM-DD'),
    });
    message.success('工资表生成成功');
    setBatchModalOpen(false);
    batchForm.resetFields();
    fetchData();
  };

  const handleMarkPaid = async (id: string) => {
    await api.patch(`/salaries/${id}/pay`);
    message.success('已标记发放');
    fetchData();
  };

  const handleEdit = (record: any) => {
    setEditing(record.id);
    form.setFieldsValue({
      ...record,
      periodStart: dayjs(record.periodStart),
      periodEnd: dayjs(record.periodEnd),
      scheduledPayDate: dayjs(record.scheduledPayDate),
      attendance_full: record.attendanceStatus?.fullAttendance ?? true,
      attendance_workDays: record.attendanceStatus?.workDays ?? 0,
      attendance_lateDays: record.attendanceStatus?.lateDays ?? 0,
      attendance_absentDays: record.attendanceStatus?.absentDays ?? 0,
      attendance_leaveDays: record.attendanceStatus?.leaveDays ?? 0,
    });
    setModalOpen(true);
  };

  const totalPaid = data.items.filter((r: any) => r.payStatus === 'paid').reduce((s: number, r: any) => s + Number(r.netSalary), 0);
  const totalPending = data.items.filter((r: any) => r.payStatus === 'pending').reduce((s: number, r: any) => s + Number(r.netSalary), 0);

  const columns = [
    { title: '员工', dataIndex: 'employee', render: (e: any) => e?.name, width: 80 },
    { title: '周期', key: 'period', width: 180, render: (_: any, r: any) => `${dayjs(r.periodStart).format('MM/DD')} ~ ${dayjs(r.periodEnd).format('MM/DD')}` },
    { title: '基本工资', dataIndex: 'baseSalary', render: (v: any) => `¥${Number(v).toLocaleString()}`, width: 100 },
    { title: '奖金', dataIndex: 'bonus', render: (v: any) => `¥${Number(v).toLocaleString()}`, width: 80 },
    { title: '扣款', dataIndex: 'deduction', render: (v: any) => `¥${Number(v).toLocaleString()}`, width: 80 },
    { title: '实发工资', dataIndex: 'netSalary', render: (v: any) => `¥${Number(v).toLocaleString()}`, width: 110 },
    { title: '状态', dataIndex: 'payStatus', width: 80, render: (v: string) => v === 'paid' ? <Tag color="green">已发放</Tag> : <Tag color="orange">待发放</Tag> },
    {
      title: '操作', width: 160,
      render: (_: any, record: any) => (
        <Space>
          {record.payStatus === 'pending' && (
            <>
              <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
              <Popconfirm title="确认已发放?" onConfirm={() => handleMarkPaid(record.id)}>
                <Button type="link" size="small" style={{ color: '#52c41a' }}>发放</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>工资管理</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card><Statistic title="已发放" value={totalPaid} precision={2} prefix="¥" valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="待发放" value={totalPending} precision={2} prefix="¥" valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="工资总和" value={totalPaid + totalPending} precision={2} prefix="¥" /></Card></Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setBatchModalOpen(true)}>生成本月工资表</Button>
      </Space>

      <Table columns={columns} dataSource={data.items} rowKey="id" loading={loading} size="small" scroll={{ x: 900 }} pagination={{ pageSize: 50 }} />

      {/* Edit modal */}
      <Modal title="编辑工资记录" open={modalOpen} width={520}
        onCancel={() => { setModalOpen(false); setEditing(null); }} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="bonus" label="奖金" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} prefix="¥" /></Form.Item>
          <Form.Item name="deduction" label="扣款" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} prefix="¥" /></Form.Item>
          <Form.Item name="netSalary" label="实发工资"><InputNumber min={0} style={{ width: '100%' }} prefix="¥" /></Form.Item>
          <Form.Item label="考勤">
            <Space wrap>
              <Form.Item name="attendance_workDays" label="出勤天数" noStyle><InputNumber min={0} style={{ width: 100 }} /></Form.Item>
              <Form.Item name="attendance_lateDays" label="迟到" noStyle><InputNumber min={0} style={{ width: 80 }} /></Form.Item>
              <Form.Item name="attendance_absentDays" label="缺勤" noStyle><InputNumber min={0} style={{ width: 80 }} /></Form.Item>
              <Form.Item name="attendance_leaveDays" label="事假" noStyle><InputNumber min={0} style={{ width: 80 }} /></Form.Item>
            </Space>
          </Form.Item>
          <Form.Item name="memo" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Batch create modal */}
      <Modal title="批量生成工资表" open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)} onOk={() => batchForm.submit()}>
        <Form form={batchForm} layout="vertical" onFinish={handleBatchCreate}>
          <Form.Item name="periodStart" label="工资周期开始" rules={[{ required: true }]} initialValue={dayjs().startOf('month')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="periodEnd" label="工资周期结束" rules={[{ required: true }]} initialValue={dayjs().endOf('month')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="scheduledPayDate" label="应发工资日期" rules={[{ required: true }]} initialValue={dayjs().date(15)}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
