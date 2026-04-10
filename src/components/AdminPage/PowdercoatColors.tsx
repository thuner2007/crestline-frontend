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
  // Basic colors
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

  // Black variations
  'black matt',
  'black gloss',
  'black satin',
  'black metallic',
  'anthracite',
  'charcoal',
  'jet black',

  // White variations
  'white matt',
  'white gloss',
  'white satin',
  'cream white',
  'pearl white',
  'off white',
  'snow white',

  // Red variations
  'red matt',
  'red gloss',
  'crimson',
  'scarlet',
  'burgundy',
  'cherry red',
  'fire red',

  // Blue variations
  'blue matt',
  'blue gloss',
  'royal blue',
  'sky blue',
  'midnight blue',
  'steel blue',
  'cobalt blue',

  // Green variations
  'green matt',
  'green gloss',
  'forest green',
  'emerald',
  'sage green',
  'mint green',
  'olive green',

  // Orange variations
  'orange matt',
  'orange gloss',
  'tangerine',
  'pumpkin',
  'coral',
  'amber',
  'peach',

  // Purple variations
  'purple matt',
  'purple gloss',
  'lavender',
  'violet',
  'plum',
  'mauve',
  'amethyst',

  // Metallic finishes
  'chrome',
  'brushed aluminum',
  'copper',
  'bronze',
  'titanium',
  'gunmetal',
  'champagne',

  // Special finishes
  'textured black',
  'textured white',
  'hammer tone',
  'wrinkle finish',
  'sand texture',
];

interface ColorInfo {
  name: string;
  hex: string;
  rgb: string;
}

const PowdercoatColors: React.FC<Props> = ({ csrfToken }) => {
  const [colors, setColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredColors, setFilteredColors] = useState<string[]>([]);
  const axiosInstance = useAxios();

  const isValidColor = (strColor: string): boolean => {
    // Allow any non-empty string as a valid color name
    // This enables custom names like "black matt", "black glanz", etc.
    return strColor.trim().length > 0;
  };

  const getColorValue = (strColor: string): string => {
    const color = tinycolor(strColor);
    // If it's a valid CSS color, show the actual color
    if (color.isValid()) {
      return color.toHexString();
    }
    // For custom color names, try to extract a base color or use a default
    const lowerStr = strColor.toLowerCase();
    if (lowerStr.includes('black')) return '#000000';
    if (lowerStr.includes('white')) return '#ffffff';
    if (lowerStr.includes('red')) return '#ff0000';
    if (lowerStr.includes('blue')) return '#0000ff';
    if (lowerStr.includes('green')) return '#008000';
    if (lowerStr.includes('yellow')) return '#ffff00';
    if (lowerStr.includes('purple')) return '#800080';
    if (lowerStr.includes('orange')) return '#ffa500';
    if (lowerStr.includes('pink')) return '#ffc0cb';
    if (lowerStr.includes('brown')) return '#a52a2a';
    if (lowerStr.includes('gray') || lowerStr.includes('grey'))
      return '#808080';
    if (lowerStr.includes('silver')) return '#c0c0c0';
    if (lowerStr.includes('gold')) return '#ffd700';
    // Default color for unknown custom names
    return '#cccccc';
  };

  const getColorInfo = (color: string): ColorInfo => {
    const tc = tinycolor(color);
    if (tc.isValid()) {
      return {
        name: color,
        hex: tc.toHexString(),
        rgb: tc.toRgbString(),
      };
    }
    // For custom color names that aren't valid CSS colors
    const estimatedHex = getColorValue(color);
    const estimatedColor = tinycolor(estimatedHex);
    return {
      name: color,
      hex: estimatedHex,
      rgb: estimatedColor.toRgbString(),
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
      const response = await axiosInstance.get<string[]>('/powdercoat-colors', {
        headers: {
          Authorization: `Bearer ${storage.getItem('access_token')}`,
          'X-CSRF-Token': csrfToken,
        },
      });
      setColors(
        Array.isArray(response.data) ? (response.data as string[]) : []
      );
    } catch (err: unknown) {
      console.error('Error fetching powdercoat colors:', err);

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
        setError(
          `Failed to fetch powdercoat colors: ${err.response.data.message}`
        );
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to fetch powdercoat colors');
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
      console.log('Adding powdercoat color:', newColor);
      await axiosInstance.post<void>(
        '/powdercoat-colors',
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
      console.error('Error adding powdercoat color:', err);

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
        setError(
          `Failed to add powdercoat color: ${err.response.data.message}`
        );
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to add powdercoat color');
      }
    }
  };

  const handleDelete = async (colorName: string) => {
    try {
      await axiosInstance.delete<void>(
        `/powdercoat-colors/${encodeURIComponent(colorName)}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );
      fetchColors();
    } catch (err: unknown) {
      console.error('Error deleting powdercoat color:', err);

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
        setError(
          `Failed to delete powdercoat color: ${err.response.data.message}`
        );
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to delete powdercoat color');
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Manage Powdercoat Colors</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md">{error}</div>
      )}

      <div className="flex gap-4 items-end mb-6">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color Name or Code
          </label>
          <div className="text-xs text-gray-500 mb-2">
            Enter any color name (e.g., &quot;black matt&quot;, &quot;blue
            glanz&quot;) or CSS color code
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full border border-gray-200"
              style={{
                backgroundColor: getColorValue(newColor),
                border: '1px solid #e5e7eb',
              }}
            />
            <div className="flex flex-col gap-1">
              <TextField
                value={newColor}
                onChange={handleColorInput}
                onFocus={() => newColor && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="e.g., black matt, #ff0000, blue glanz"
                size="small"
                style={{ minWidth: '250px' }}
              />
              {newColor && (
                <div className="text-xs text-gray-500">
                  Preview: {getColorInfo(newColor).hex} |{' '}
                  {getColorInfo(newColor).rgb}
                  {!tinycolor(newColor).isValid() && (
                    <span className="text-orange-600 ml-2">
                      (Custom color name)
                    </span>
                  )}
                </div>
              )}
            </div>
            {showSuggestions && filteredColors.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-white border rounded-md shadow-lg z-10">
                {filteredColors.map((color) => (
                  <div
                    key={color}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setNewColor(color);
                      setShowSuggestions(false);
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200"
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
          variant="contained"
          color="primary"
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
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {colors.map((color) => {
            const colorInfo = getColorInfo(color);
            return (
              <TableRow key={color}>
                <TableCell>
                  <div
                    className="w-8 h-8 rounded-full border border-gray-200"
                    style={{ backgroundColor: colorInfo.hex }}
                  />
                </TableCell>
                <TableCell>{color}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{colorInfo.hex}</div>
                    <div className="text-gray-500">{colorInfo.rgb}</div>
                    {!tinycolor(color).isValid() && (
                      <div className="text-xs text-orange-600 mt-1">
                        Custom color name
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleDelete(color)} color="error">
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

export default PowdercoatColors;
