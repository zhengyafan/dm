import { Card, Space, Tag, Typography } from 'antd';

const { Text, Title } = Typography;

const typeLabels = {
  parttime: '打野',
  step: '阶梯',
  fulltime: '全职',
  box: '盒装',
  city: '城限'
};

const typeColors = {
  parttime: 'green',
  step: 'gold',
  fulltime: 'blue',
  box: 'default',
  city: 'purple'
};

export function formatMoney(value) {
  const number = Number(value || 0);
  return `¥${number.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function PageShell({ title, description, extra, children }) {
  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <Text className="app-page-kicker">DM MANAGEMENT</Text>
          <Title level={2} className="app-page-title">{title}</Title>
          {description && <Text className="app-page-description">{description}</Text>}
        </div>
        {extra && <div className="app-page-extra">{extra}</div>}
      </div>
      {children}
    </div>
  );
}

export function Toolbar({ filters, actions, meta }) {
  return (
    <div className="app-toolbar">
      <div className="app-toolbar-filters">{filters}</div>
      <div className="app-toolbar-actions">
        {meta}
        {actions}
      </div>
    </div>
  );
}

export function MetricCard({ label, value, icon, tone = 'teal', suffix, onClick }) {
  return (
    <Card
      className={`metric-card metric-card-${tone}${onClick ? ' metric-card-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="metric-card-top">
        <span className="metric-card-label">{label}</span>
        {icon && <span className="metric-card-icon">{icon}</span>}
      </div>
      <div className="metric-card-value">{value}{suffix && <span>{suffix}</span>}</div>
    </Card>
  );
}

export function MoneyText({ value, strong = false, tone = 'default' }) {
  return (
    <span className={`money-text money-text-${tone}${strong ? ' money-text-strong' : ''}`}>
      {formatMoney(value)}
    </span>
  );
}

export function TypeTag({ value }) {
  return (
    <Tag color={typeColors[value] || 'default'} className="app-tag">
      {typeLabels[value] || value || '未设置'}
    </Tag>
  );
}

export function RecordCount({ count, selected }) {
  return (
    <Space size={8} className="record-count">
      <span>{count || 0} 条记录</span>
      {!!selected && <Tag color="processing">已选 {selected} 条</Tag>}
    </Space>
  );
}

export function tablePagination(totalLabel = '记录') {
  return {
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条${totalLabel}`
  };
}

export function actionColumnWidth(count = 2) {
  return count > 2 ? 150 : 112;
}
