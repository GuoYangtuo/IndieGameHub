import React, { Suspense, ComponentType } from 'react';
import { Box, CircularProgress, Alert, Card, CardContent } from '@mui/material';

// 加载组件
const LoadingComponent = () => (
    <Box 
        sx={{ 
            width: "100%", 
            height: "50vh", 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2
        }}
    >
        <CircularProgress size={40} />
        <Box sx={{ color: 'text.secondary', fontSize: '14px' }}>
            正在加载页面...
        </Box>
    </Box>
);

// 错误边界组件
class LoadableErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error('Loadable component error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box 
                    sx={{ 
                        width: "100%", 
                        height: "50vh", 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        p: 2
                    }}
                >
                    <Card sx={{ maxWidth: 400, width: '100%' }}>
                        <CardContent>
                            <Alert severity="error">
                                加载错误，请刷新页面重试
                            </Alert>
                        </CardContent>
                    </Card>
                </Box>
            );
        }

        return this.props.children;
    }
}

// 使用 React.lazy 实现按需加载
export default function withLoadable<T extends ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>
) {
    const LazyComponent = React.lazy(importFunc);
    
    return (props: React.ComponentProps<T>) => (
        <LoadableErrorBoundary>
            <Suspense fallback={<LoadingComponent />}>
                <LazyComponent {...props} />
            </Suspense>
        </LoadableErrorBoundary>
    );
}