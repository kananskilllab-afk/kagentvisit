import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange, disabled, placeholder }) => {
    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const formats = [
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'link', 'image'
    ];

    return (
        <div className={`rich-text-editor bg-white rounded-xl overflow-hidden border border-slate-200 focus-within:border-brand-blue/30 focus-within:ring-4 focus-within:ring-brand-blue/10 transition-all ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
            <ReactQuill
                theme="snow"
                value={value || ''}
                onChange={onChange}
                modules={modules}
                formats={formats}
                readOnly={disabled}
                placeholder={placeholder}
                className="border-none [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[120px] [&_.ql-toolbar]:bg-slate-50/50"
            />
        </div>
    );
};

export default RichTextEditor;
