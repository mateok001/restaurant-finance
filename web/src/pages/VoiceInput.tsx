import { useState, useRef, useEffect } from 'react';
import { Card, Button, Table, InputNumber, Input, Select, DatePicker, message, Space, Spin, Alert, Tag } from 'antd';
import { AudioOutlined, AudioMutedOutlined, CheckOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

export default function VoiceInputPage() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [purchaseDate, setPurchaseDate] = useState<dayjs.Dayjs>(dayjs());
  const [submitted, setSubmitted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup MediaRecorder and stream on unmount
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      message.error('无法访问麦克风，请检查权限');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const processAudio = async (audioBlob: Blob) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('purchaseDate', purchaseDate.format('YYYY-MM-DD'));

      const res = await api.post('/purchases/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setRawText(res.data.rawText);
      setItems(res.data.parsedItems || []);
    } catch (err: any) {
      message.error(err.response?.data?.error || err.message || '语音识别失败，请重试');
      // Demo data (for reference only):
      // setRawText('今天从老王菜铺买了50斤土豆每斤2块5，还买了30斤五花肉16块一斤');
      // setItems([
      //   { productName: '土豆', supplierName: '老王菜铺', quantity: 50, unit: '斤', unitPrice: 2.5 },
      //   { productName: '五花肉', supplierName: '老王菜铺', quantity: 30, unit: '斤', unitPrice: 16 },
      // ]);
    } finally {
      setProcessing(false);
    }
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
        inputMethod: 'voice',
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
    setSubmitted(false);
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>语音记账</h2>
      <Alert message="点击录音按钮，说出采购信息，系统将自动识别并填入表单。请确认无误后提交。" type="info" showIcon style={{ marginBottom: 16 }} />

      <Card style={{ marginBottom: 16, textAlign: 'center' }}>
        <Space direction="vertical" size="large">
          <div>
            <DatePicker value={purchaseDate} onChange={(v) => v && setPurchaseDate(v)} style={{ width: 200 }} />
            <span style={{ marginLeft: 8, color: '#999' }}>采购日期</span>
          </div>
          <Button
            type={recording ? 'default' : 'primary'}
            size="large"
            shape="circle"
            icon={recording ? <AudioMutedOutlined /> : <AudioOutlined />}
            onClick={recording ? stopRecording : startRecording}
            danger={recording}
            style={{ width: 80, height: 80, fontSize: 24 }}
          />
          <div style={{ fontSize: 16, color: recording ? '#ff4d4f' : '#D4A574' }}>
            {recording ? '录音中...点击停止' : processing ? '处理中...' : '点击开始录音'}
          </div>
          {processing && <Spin />}
        </Space>
      </Card>

      {rawText && (
        <Card title="识别结果" style={{ marginBottom: 16 }}>
          <p style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>{rawText}</p>

          <h4 style={{ marginTop: 16 }}>解析结果（请逐项确认）</h4>
          <Table
            dataSource={items.map((item, index) => ({ ...item, key: index }))}
            size="small"
            pagination={false}
            columns={[
              {
                title: '商品', dataIndex: 'productName', width: 120,
                render: (v: string, _: any, index: number) => (
                  <Input value={v} onChange={(e) => updateItem(index, 'productName', e.target.value)} size="small" />
                ),
              },
              {
                title: '供应商', dataIndex: 'supplierName', width: 120,
                render: (v: string, _: any, index: number) => (
                  <Input value={v} onChange={(e) => updateItem(index, 'supplierName', e.target.value)} size="small" />
                ),
              },
              {
                title: '数量', dataIndex: 'quantity', width: 100,
                render: (v: number, _: any, index: number) => (
                  <InputNumber value={v} onChange={(val) => updateItem(index, 'quantity', val)} size="small" min={0} style={{ width: 80 }} />
                ),
              },
              {
                title: '单位', dataIndex: 'unit', width: 80,
                render: (v: string, _: any, index: number) => (
                  <Select value={v} onChange={(val) => updateItem(index, 'unit', val)} size="small" style={{ width: 70 }}
                    options={['斤','公斤','个','箱','捆','袋','包','瓶','桶','把','只','条','份','盘','件','套'].map(u => ({ label: u, value: u }))} />
                ),
              },
              {
                title: '单价', dataIndex: 'unitPrice', width: 100,
                render: (v: number, _: any, index: number) => (
                  <InputNumber value={v} onChange={(val) => updateItem(index, 'unitPrice', val)} size="small" min={0} prefix="¥" style={{ width: 90 }} />
                ),
              },
              {
                title: '小计', width: 100,
                render: (_: any, record: any) => `¥${((record.quantity || 0) * (record.unitPrice || 0)).toFixed(2)}`,
              },
            ]}
          />

          <Space style={{ marginTop: 16 }}>
            <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm} disabled={submitted || items.length === 0}>
              确认提交
            </Button>
            <Button onClick={handleReset} disabled={submitted}>重新录入</Button>
          </Space>
          {submitted && <Tag color="green" style={{ marginLeft: 8 }}>已提交成功</Tag>}
        </Card>
      )}
    </div>
  );
}
