import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Request } from 'express';
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
    }
  };

  const loadMorePosts = async (): Promise<void> => {
    setLoading(true);
    try {
      const newPosts = await feedService.getPosts(page);
      setPosts((prevPosts: Post[]) => [...prevPosts, ...newPosts]);
      setPage((prevPage: number) => prevPage + 1);
      setHasMore(newPosts.length > 0);
    } catch (error) {
      console.error('Error loading posts:', error);
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
  }, [loading, hasMore, loadMorePosts]);

  const handleCreatePost = async (newPost: CreatePostData): Promise<void> => {
    try {
      const createdPost = await feedService.createPost({
        ...newPost,
        likes: 0,
        comments: 0,
      });
      setPosts((prevPosts: Post[]) => [createdPost, ...prevPosts]);
      setCreatePostOpen(false);
    } catch (error) {
      console.error('Error creating post:', error);
      // TODO: Add error handling UI
    }
  };

  const handleTopicClick = (tag: string): void => {
    setSearchQuery(tag);
  };

  useEffect(() => {
    loadMorePosts();
    loadTrendingTopics();
  }, [loadMorePosts]);

  // Add search functionality
  useEffect(() => {
    const searchPosts = async () => {
      if (searchQuery.trim()) {
        setLoading(true);
        try {
          const results = await feedService.searchPosts(searchQuery);
          setPosts(results);
        } catch (error) {
          console.error('Error searching posts:', error);
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
  }, [searchQuery, loadMorePosts]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <FeedHeader />
        <SearchBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <Stack spacing={2} sx={styles.postList}>
          {posts.map((post: Post, index: number) => (
            <Box
            key={post._id}
              ref={index === posts.length - 1 ? lastPostRef : undefined}
            >
              <PostCard post={post} />
            </Box>
          ))}
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
        onSubmit={async (post: CreatePostData) => {
          await handleCreatePost(post);
        }}
      />
    </Grid>
  );
};

export default Feed;