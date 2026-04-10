import { TextData, ShapeData, ImageData } from '@/types/elementTypes';
import React, { useState } from 'react';
import ImageUpload from './ImageUpload';
import { useTranslations } from 'next-intl';

interface AddElementsPanelProps {
  addText: (text: TextData) => void;
  addShape: (shape: ShapeData) => void;
  addImage: (image: ImageData) => void;
  fontFamilies: string[];
}

const AddElementsPanel: React.FC<AddElementsPanelProps> = ({
  addText,
  addShape,
  addImage,
  fontFamilies,
}) => {
  const t = useTranslations('editor');

  const [currentText, setCurrentText] = useState<TextData>({
    id: '',
    type: 'text',
    text: '',
    fontSize: 0.5,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    color: '#000000',
    x: 0,
    y: 0,
    zIndex: 0,
  });

  const [currentShape, setCurrentShape] = useState<ShapeData>({
    id: '',
    type: 'circle',
    color: '#FF0000',
    width: 5,
    height: 5,
    x: 0,
    y: 0,
    zIndex: 0,
  });

  const handleAddText = () => {
    if (currentText.text.trim() !== '') {
      addText(currentText);
      setCurrentText({ ...currentText, text: '' });
    }
  };

  const handleAddShape = () => {
    addShape(currentShape);
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 10; // Maximum dimension in cm
        const newImage: ImageData = {
          id: '',
          type: 'image',
          src: e.target?.result as string,
          originalImage: e.target?.result as string, // Store original image
          width: maxDimension,
          height: maxDimension,
          x: 0,
          y: 0,
          zIndex: 0,
        };
        addImage(newImage);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold mb-2'>{t('addText')}</h3>
        <input
          type='text'
          value={currentText.text}
          onChange={(e) =>
            setCurrentText({ ...currentText, text: e.target.value })
          }
          className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600'
          placeholder='Enter your text'
        />
        <div className='flex gap-4 mt-2'>
          <input
            type='number'
            value={currentText.fontSize}
            onChange={(e) =>
              setCurrentText({
                ...currentText,
                fontSize: parseFloat(e.target.value) || 0.5,
              })
            }
            step='0.1'
            className='w-1/4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600'
            placeholder='Font size (cm)'
          />
          <select
            value={currentText.fontFamily}
            onChange={(e) =>
              setCurrentText({ ...currentText, fontFamily: e.target.value })
            }
            className='w-1/4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600'
          >
            {fontFamilies.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <select
            value={currentText.fontWeight}
            onChange={(e) =>
              setCurrentText({
                ...currentText,
                fontWeight: e.target.value as TextData['fontWeight'],
              })
            }
            className='w-1/4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600'
          >
            <option value='normal'>{t('normal')}</option>
            <option value='bold'>{t('bold')}</option>
            <option value='bolder'>{t('bolder')}</option>
            <option value='boldest'>{t('boldest')}</option>
          </select>
          <input
            type='color'
            value={currentText.color}
            onChange={(e) =>
              setCurrentText({ ...currentText, color: e.target.value })
            }
            className='w-1/4 h-10'
          />
        </div>
        <button
          onClick={handleAddText}
          disabled={currentText.text.trim() === ''}
          className='w-full mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed'
        >
          {t('addText')}
        </button>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-2'>{t('addShape')}</h3>
        <div className='flex gap-4 mb-2'>
          <select
            value={currentShape.type}
            onChange={(e) =>
              setCurrentShape({
                ...currentShape,
                type: e.target.value as ShapeData['type'],
              })
            }
            className='w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600'
          >
            <option value='circle'>{t('circle')}</option>
            <option value='square'>{t('square')}</option>
            <option value='triangle'>{t('triangle')}</option>
          </select>
          <input
            type='color'
            value={currentShape.color}
            onChange={(e) =>
              setCurrentShape({ ...currentShape, color: e.target.value })
            }
            className='w-1/3 h-10'
          />
        </div>
        <div className='flex gap-4 mb-2'>
          <input
            type='number'
            value={currentShape.width}
            onChange={(e) =>
              setCurrentShape({
                ...currentShape,
                width: parseFloat(e.target.value) || 5,
              })
            }
            step='0.1'
            className='w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600'
            placeholder='Width (cm)'
          />
          <input
            type='number'
            value={currentShape.height}
            onChange={(e) =>
              setCurrentShape({
                ...currentShape,
                height: parseFloat(e.target.value) || 5,
              })
            }
            step='0.1'
            className='w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600'
            placeholder='Height (cm)'
          />
        </div>
        <button
          onClick={handleAddShape}
          className='w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors'
        >
          {t('addShape')}
        </button>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-2'>{t('addImage')}</h3>
        <ImageUpload onImageUpload={handleImageUpload} />
      </div>
    </div>
  );
};

export default AddElementsPanel;
