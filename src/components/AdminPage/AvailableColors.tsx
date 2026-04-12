import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Button,
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import storage from '@/lib/storage';
import tinycolor from 'tinycolor2';
import useAxios from '@/useAxios';

interface Props {
  csrfToken: string;
}

const COMMON_COLORS = [
  'black',
  'white',
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'brown',
  'gray',
  'cyan',
  'magenta',
  'lime',
  'teal',
  'indigo',
  'violet',
  'maroon',
  'navy',
  'olive',
  'silver',
  'gold',
];

interface ColorInfo {
  name: string;
  hex: string;
  rgb: string;
}

const AvailableColors: React.FC<Props> = ({ csrfToken }) => {
  const [colors, setColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredColors, setFilteredColors] = useState<string[]>([]);
  const axiosInstance = useAxios();

  const isValidColor = (strColor: string): boolean => {
    return tinycolor(strColor).isValid();
  };

  const getColorValue = (strColor: string): string => {
    const color = tinycolor(strColor);
    return color.isValid() ? color.toHexString() : '#ddd';
  };

  const getColorInfo = (color: string): ColorInfo => {
    const tc = tinycolor(color);
    return {
      name: color,
      hex: tc.toHexString(),
      rgb: tc.toRgbString(),
    };
  };

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewColor(value);

    if (value.length > 0) {
      const matches = COMMON_COLORS.filter((color) =>
        color.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredColors(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const fetchColors = async () => {
    try {
      const response = await axiosInstance.get<string[]>('/available-colors', {
        headers: {
          Authorization: `Bearer ${storage.getItem('access_token')}`,
          'X-CSRF-Token': csrfToken,
        },
      });
      setColors(
        Array.isArray(response.data) ? (response.data as string[]) : []
      );
    } catch (err: unknown) {
      console.error('Error fetching colors:', err);

      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
      ) {
        setError(`Failed to fetch colors: ${err.response.data.message}`);
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to fetch colors');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csrfToken]);

  const handleAddColor = async () => {
    try {
      console.log('Adding color:', newColor);
      await axiosInstance.post<void>(
        '/available-colors',
        { color: newColor },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );
      setNewColor('');
      fetchColors();
      setError(''); // Clear error on success
    } catch (err: unknown) {
      console.error('Error adding color:', err);

      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
      ) {
        setError(`Failed to add color: ${err.response.data.message}`);
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to add color');
      }
    }
  };

  const handleDelete = async (colorName: string) => {
    try {
      await axiosInstance.delete<void>(
        `/available-colors/${encodeURIComponent(colorName)}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );
      fetchColors();
    } catch (err: unknown) {
      console.error('Error deleting color:', err);

      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
      ) {
        setError(`Failed to delete color: ${err.response.data.message}`);
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to delete color');
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-xl font-semibold'>Manage Vinyl Colors</h2>

      {error && (
        <div className='bg-red-50 text-red-600 p-3 rounded-md'>{error}</div>
      )}

      <div className='flex gap-4 items-end mb-6'>
        <div className='relative'>
          <label className='block text-sm font-medium text-zinc-300 mb-1'>
            Color Name
          </label>
          <div className='flex items-center gap-2'>
            <div
              className='w-8 h-8 rounded-full border border-zinc-700'
              style={{
                backgroundColor: getColorValue(newColor),
                border: '1px solid #e5e7eb',
              }}
            />
            <div className='flex flex-col gap-1'>
              <TextField
                value={newColor}
                onChange={handleColorInput}
                onFocus={() => newColor && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder='Enter color name or code'
                size='small'
              />
              {isValidColor(newColor) && (
                <div className='text-xs text-zinc-400'>
                  {getColorInfo(newColor).hex} | {getColorInfo(newColor).rgb}
                </div>
              )}
            </div>
            {showSuggestions && filteredColors.length > 0 && (
              <div className='absolute top-full mt-1 w-full bg-zinc-900 border rounded-md shadow-lg z-10'>
                {filteredColors.map((color) => (
                  <div
                    key={color}
                    className='flex items-center gap-2 p-2 hover:bg-zinc-800 cursor-pointer'
                    onClick={() => {
                      setNewColor(color);
                      setShowSuggestions(false);
                    }}
                  >
                    <div
                      className='w-4 h-4 rounded-full border border-zinc-700'
                      style={{ backgroundColor: color }}
                    />
                    <span>{color}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button
          variant='contained'
          color='primary'
          startIcon={<Add />}
          onClick={handleAddColor}
          disabled={!newColor || !isValidColor(newColor)}
        >
          Add Color
        </Button>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Color Preview</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Hex / RGB</TableCell>
            <TableCell align='right'>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {colors.map((color) => {
            const colorInfo = getColorInfo(color);
            return (
              <TableRow key={color}>
                <TableCell>
                  <div
                    className='w-8 h-8 rounded-full border border-zinc-700'
                    style={{ backgroundColor: colorInfo.hex }}
                  />
                </TableCell>
                <TableCell>{color}</TableCell>
                <TableCell>
                  <div className='text-sm text-zinc-400'>
                    {colorInfo.hex}
                    <br />
                    {colorInfo.rgb}
                  </div>
                </TableCell>
                <TableCell align='right'>
                  <IconButton onClick={() => handleDelete(color)} color='error'>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default AvailableColors;
