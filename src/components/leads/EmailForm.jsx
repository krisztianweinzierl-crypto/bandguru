import React, { useState } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Send, X, Mail, User } from "lucide-react";

export default function EmailForm({ lead, onSubmit, onCancel, isSending }) {
  const [formData, setFormData] = useState({
    betreff: `Anfrage: ${lead.titel}`,
    inhalt: `<p>Hallo ${lead.kontaktperson || 'Sehr geehrte Damen und Herren'},</p><p><br></p><p>vielen Dank für Ihre Anfrage.</p><p><br></p><p>Mit freundlichen Grüßen</p>`
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'link'
  ];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>E-Mail verfassen</CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>An: {lead.email}</span>
              </div>
              {lead.kontaktperson && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{lead.kontaktperson}</span>
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Betreff */}
          <div className="space-y-2">
            <Label htmlFor="betreff">Betreff *</Label>
            <Input
              id="betreff"
              value={formData.betreff}
              onChange={(e) => handleChange('betreff', e.target.value)}
              placeholder="E-Mail-Betreff eingeben..."
              required
            />
          </div>

          {/* Nachricht (Rich Text Editor) */}
          <div className="space-y-2">
            <Label>Nachricht *</Label>
            <div className="border border-gray-200 rounded-lg">
              <ReactQuill
                theme="snow"
                value={formData.inhalt}
                onChange={(value) => handleChange('inhalt', value)}
                modules={modules}
                formats={formats}
                placeholder="E-Mail-Text eingeben..."
                className="min-h-[300px]"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSending}>
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={isSending}
              style={{ backgroundColor: '#223a5e' }}
              className="hover:opacity-90"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Wird versendet..." : "E-Mail senden"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}