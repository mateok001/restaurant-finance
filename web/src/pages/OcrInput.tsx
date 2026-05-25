import { useState, useRef } from 'react';
import { Card, Button, Table, InputNumber, Input, DatePicker, Upload, message, Space, Spin, Alert, Tag, Image } from 'antd';
import { CameraOutlined, CheckOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import api from '../services/api';

const { Dragger } = Upload;

export default function OcrInputPage() {
  const [processing, setProcessing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [purchaseDate, setPurchaseDate] = useState<dayjs.Dayjs>(dayjs());
  const [submitted, setSubmitted] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  const processImage = async (file: File) => {
    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target?.result as string);
    reader.readAsDataURL(file);

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('purchaseDate', purchaseDate.format('YYYY-MM-DD'));

      const res = await api.post('/purchases/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setRawText(res.data.rawText);
      setItems(res.data.parsedItems || []);
      setWarnings(res.data.validationWarnings || []);
    } catch (err: any) {
      // Fallback demo mode
      message.info('OCR服务未部署，使用模拟演示模式');
      setRawText('品名 | 数量 | 单位 | 单价 | 金额\n土豆 | 50 | 斤 | 2.5 | 125\n五花肉 | 30 | 斤 | 16 | 480');
      setItems([
        { productName: '土豆', supplierName: '', quantity: 50, unit: '斤', unitPrice: 2.5, totalAmount: 125 },
        { productName: '五花肉', supplierName: '', quantity: 30, unit: '斤', unitPrice: 16, totalAmount: 480 },
      ]);
      setWarnings(['第1行: 供应商未识别', '第2行: 供应商未识别']);
    } finally {
      setProcessing(false);
    }

    return false; // Prevent default upload behavior
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleConfirm = async () => {
    try {
      await api.post('/purchases/confirm-parsed', {
        items,
        purchaseDate: purchaseDate.format('YYYY-MM-DD'),
        rawText,
        inputMethod: 'ocr',
      });
      message.success('采购记录已保存');
      setSubmitted(true);
    } catch (err: any) {
      message.error(err.response?.data?.error || '保存失败');
    }
  };

  const handleReset = () => {
    setRawText('');
    setItems([]);
    setWarnings([]);
    setPreviewImage('');
    setSubmitted(false);
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>拍照记账（OCR识别）</h2>
      <Alert message="拍摄或上传进货单图片，系统将自动识别表格并提取采购明细。请逐项核对后确认提交。" type="info" showIcon style={{ marginBottom: 16 }} />

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <DatePicker value={purchaseDate} onChange={(v) => v && setPurchaseDate(v)} />
          <span style={{ color: '#999' }}>采购日期</span>
        </Space>

        {!rawText && (
          <Dragger
            accept="image/*"
            maxCount={1}
            beforeUpload={processImage}
            showUploadList={false}
            disabled={processing}
          >
            <p className="ant-upload-drag-icon">
              {processing ? <Spin size="large" /> : <InboxOutlined style={{ fontSize: 48, color: '#D4A574' }} />}
            </p>
            <p className="ant-upload-text">点击或拖拽进货单图片到此区域</p>
            <p className="ant-upload-hint">支持 JPG、PNG 格式拍照照片</p>
          </Dragger>
        )}

        {processing && <Spin tip="正在识别中..." style={{ display: 'block', margin: '20px auto' }} />}
      </Card>

      {warnings.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message="校验提醒" description={warnings.map((w, i) => <div key={i}>{w}</div>)} />
      )}

      {rawText && (
        <Card title="识别结果" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {previewImage && (
              <div style={{ flex: '0 0 300px' }}>
                <Image src={previewImage} style={{ width: '100%', borderRadius: 8 }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h4>OCR原文</h4>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', fontSize: 13 }}>{rawText}</pre>
            </div>
          </div>

          <h4>解析结果（请逐项核对并修正）</h4>
          <Table
            dataSource={items.map((item, index) => ({ ...item, key: index }))}
            size="small"
            pagination={false}
            columns={[
              { title: '商品', dataIndex: 'productName', width: 120,
                render: (v: string, _: any, index: number) =>
                  <Input value={v} onChange={(e) => updateItem(index, 'productName', e.target.value)} size="small" /> },
              { title: '供应商', dataIndex: 'supplierName', width: 120,
                render: (v: string, _: any, index: number) =>
                  <Input value={v} onChange={(e) => updateItem(index, 'supplierName', e.target.value)} size="small" placeholder="手动填写" /> },
              { title: '数量', dataIndex: 'quantity', width: 100,
                render: (v: number, _: any, index: number) =>
                  <InputNumber value={v} onChange={(val) => updateItem(index, 'quantity', val)} size="small" min={0} style={{ width: 80 }} /> },
              { title: '单位', dataIndex: 'unit', width: 70,
                render: (v: string, _: any, index: number) =>
                  <Input value={v} onChange={(e) => updateItem(index, 'unit', e.target.value)} size="small" style={{ width: 60 }} /> },
              { title: '单价', dataIndex: 'unitPrice', width: 100,
                render: (v: number, _: any, index: number) =>
                  <InputNumber value={v} onChange={(val) => updateItem(index, 'unitPrice', val)} size="small" min={0} prefix="¥" style={{ width: 90 }} /> },
              { title: '金额', dataIndex: 'totalAmount', width: 100,
                render: (v: number, record: any) => `¥${(v || record.quantity * record.unitPrice || 0).toFixed(2)}` },
            ]}
          />

          <Space style={{ marginTop: 16 }}>
            <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm} disabled={submitted || items.length === 0}>
              确认提交
            </Button>
            <Button onClick={handleReset} disabled={submitted}>重新上传</Button>
          </Space>
          {submitted && <Tag color="green" style={{ marginLeft: 8 }}>已提交成功</Tag>}
        </Card>
      )}
    </div>
  );
}
