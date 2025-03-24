import React, { useState, useEffect, useCallback, useRef } from 'react';
import feedService from '../services/couchdb';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Avatar,
  Chip,
  Button,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Fab,
  CircularProgress,
  Theme,
  Alert,
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ChatBubbleOutline as CommentIcon,
  Share as ShareIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { feedStyles as styles } from '../styles/pages/Feed.styles';
import CreatePost from '../components/feed/CreatePost';
import TrendingTopics from '../components/feed/TrendingTopics';
import { Post, TrendingTopic, SearchBarProps, PostCardProps, CreatePostData } from '../types/feed';

const FeedHeader: React.FC = () => (
  <Stack direction="row" sx={styles.header}>
    <Typography variant="h5">Feed</Typography>
    <IconButton>
      <MoreVertIcon />
    </IconButton>
  </Stack>
);

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, onSearchChange }) => (
  <Stack direction="row" sx={styles.searchContainer}>
    <TextField
      fullWidth
      placeholder="Search posts..."
      value={searchQuery}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
      size="small"
      sx={styles.searchField}
    />
    <Button
      variant="outlined"
      startIcon={<FilterListIcon />}
      sx={styles.filterButton}
    >
      Filter
    </Button>
  </Stack>
);

const PostCard: React.FC<PostCardProps> = ({ post }) => (
  <Card sx={styles.postCard}>
    <CardContent>
      <Stack spacing={2}>
        <Stack direction="row" sx={styles.postHeader}>
          <Stack direction="row" sx={styles.authorInfo}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>{post.avatar}</Avatar>
            <Box>
              <Typography variant="subtitle1">{post.author}</Typography>
              <Typography variant="caption" color="text.secondary">
                {post.timestamp}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Stack>

        <Box sx={styles.postContent}>
          <Typography variant="h6" gutterBottom>
            {post.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {post.content}
          </Typography>
        </Box>

        <Stack direction="row" sx={styles.tags}>
          {post.tags.map((tag: string) => (
            <Chip 
              key={tag} 
              label={tag} 
              size="small"
              sx={styles.tag}
            />
          ))}
        </Stack>

        <Divider />

        <Stack direction="row" sx={styles.actions}>
          <Button
            startIcon={<ThumbUpIcon />}
            size="small"
            sx={styles.actionButton}
          >
            {post.likes}
          </Button>
          <Button
            startIcon={<CommentIcon />}
            size="small"
            sx={styles.actionButton}
          >
            {post.comments}
          </Button>
          <Button
            startIcon={<ShareIcon />}
            size="small"
            sx={styles.actionButton}
          >
            Share
          </Button>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [createPostOpen, setCreatePostOpen] = useState<boolean>(false);
  const observer = useRef<IntersectionObserver | null>(null);
  
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);

  const loadTrendingTopics = async (): Promise<void> => {
    try {
      const topics = await feedService.getTrendingTopics();
      setTrendingTopics(topics);
    } catch (error) {
      console.error('Error loading trending topics:', error);
      // Don't show error for trending topics as it's not critical
    }
  };

  const loadMorePosts = async (): Promise<void> => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // For demo purposes, create mock posts
      const mockPosts = Array(5).fill(null).map((_, index) => ({
        _id: `post_${page}_${index}`,
        title: `Sample Post ${page}_${index}`,
        content: 'This is a sample post content. The database is currently mocked.',
        author: 'Demo User',
        avatar: 'DU',
        timestamp: new Date().toISOString(),
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20),
        tags: ['sample', 'demo'],
      }));

      setPosts((prevPosts: Post[]) => [...prevPosts, ...mockPosts]);
      setPage((prevPage: number) => prevPage + 1);
      setHasMore(mockPosts.length > 0);
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const lastPostRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const handleCreatePost = async (newPost: CreatePostData): Promise<void> => {
    try {
      const mockPost = {
        _id: `post_new_${Date.now()}`,
        ...newPost,
        author: 'Demo User',
        avatar: 'DU',
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
      };
      
      setPosts((prevPosts: Post[]) => [mockPost, ...prevPosts]);
      setCreatePostOpen(false);
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post. Please try again.');
    }
  };

  const handleTopicClick = (tag: string): void => {
    setSearchQuery(tag);
  };

  useEffect(() => {
    loadMorePosts();
    loadTrendingTopics();
  }, []);

  // Add search functionality
  useEffect(() => {
    const searchPosts = async () => {
      if (searchQuery.trim()) {
        setLoading(true);
        setError(null);
        try {
          // Mock search results
          const filteredPosts = posts.filter(post => 
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          setPosts(filteredPosts);
        } catch (error) {
          console.error('Error searching posts:', error);
          setError('Failed to search posts. Please try again.');
        } finally {
          setLoading(false);
        }
      } else {
        // Reset to initial state when search is cleared
        setPosts([]);
        setPage(1);
        loadMorePosts();
      }
    };

    const debounceTimer = setTimeout(searchPosts, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <FeedHeader />
        <SearchBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Stack spacing={2} sx={styles.postList}>
          {posts.length === 0 && !loading && !error ? (
            <Card sx={styles.postCard}>
              <CardContent>
                <Typography variant="body1" color="text.secondary" align="center">
                  No posts yet. Be the first to create one!
                </Typography>
              </CardContent>
            </Card>
          ) : (
            posts.map((post: Post, index: number) => (
              <Box
                key={post._id}
                ref={index === posts.length - 1 ? lastPostRef : undefined}
              >
                <PostCard post={post} />
              </Box>
            ))
          )}
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </Stack>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <TrendingTopics
          topics={trendingTopics}
          onTopicClick={handleTopicClick}
        />
      </Grid>

      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: (theme: Theme) => theme.spacing(2),
          right: (theme: Theme) => theme.spacing(2),
        }}
        onClick={() => setCreatePostOpen(true)}
      >
        <AddIcon />
      </Fab>

      <CreatePost
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onSubmit={handleCreatePost}
      />
    </Grid>
  );
};

export default Feed;
