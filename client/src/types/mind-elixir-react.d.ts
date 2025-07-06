declare module 'mind-elixir-react' {
  export interface MindElixirInstance {
    getData: () => any;
    setData: (data: any) => void;
  }
  
  export interface MindElixirOptions {
    direction?: number;
    allowUndo?: boolean;
    contextMenu?: boolean;
    contextMenuOption?: {
      add?: boolean;
      edit?: boolean;
      delete?: boolean;
    };
    toolBar?: boolean;
    nodeMenu?: boolean;
    keypress?: boolean;
    draggable?: boolean;
    editable?: boolean;
  }
  
  export interface MindElixirProps {
    data: any;
    options: MindElixirOptions;
  }
  
  const MindElixir: React.ForwardRefExoticComponent<
    MindElixirProps & React.RefAttributes<MindElixirInstance>
  >;
  
  export default MindElixir;
} 