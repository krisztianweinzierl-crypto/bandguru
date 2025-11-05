// ... keep existing code (imports and component until buttons section) ...

              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                Abbrechen
              </Button>
              <Button 
                type="submit"
                style={{ backgroundColor: '#223a5e' }}
                className="hover:opacity-90"
              >
                Rechnung speichern
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

// ... keep existing code (rest of component) ...