import React, { memo } from 'react';
import { Card, CardContent, Box, Typography, Radio } from '@mui/material';

interface PaymentMethodCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: (id: string) => void;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = memo(({
  id,
  name,
  description,
  icon,
  isSelected,
  onClick,
}) => {
  const handleClick = () => {
    onClick(id);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        cursor: 'pointer',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        bgcolor: isSelected ? 'primary.50' : 'background.paper',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 1
        }
      }}
      onClick={handleClick}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <Box sx={{ color: 'primary.main' }}>
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight="600">
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Radio
          checked={isSelected}
          value={id}
          onChange={handleClick}
          onClick={(e) => e.stopPropagation()}
        />
      </CardContent>
    </Card>
  );
});

PaymentMethodCard.displayName = 'PaymentMethodCard';

export default PaymentMethodCard;
