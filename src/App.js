import React from 'react';
import axios from 'axios';
import { sortBy } from 'lodash';

import './App.css'

// API Endpoint
const API_ENDPOINT = 'https://hn.algolia.com/api/v1/search?query='

const API_BASE = 'https://hn.algolia.com/api/v1';
const API_SEARCH = '/search';
const PARAM_SEARCH = 'query=';
const PARAM_PAGE = 'page=';

// reducer function
const storiesReducer = (state, action) => {
  switch (action.type) {
    case 'STORIES_FETCH_INIT':
    return {
      ...state,
      isLoading: true,
      isError: false
    }  
    case 'STORIES_FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: 
        action.payload.page === 0
         ? action.payload.list
         : action.payload.list.concat(action.payload.list),
        page: action.payload.page,
      }
    case 'STORIES_FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      }
    case 'REMOVE_STORY':
      return {
        ...state,
        data: state.data.filter(
          story => action.payload.objectID !== story.objectID
        ) 
      } 
    default:
      throw new Error()
  }
}

// custom hook
const useSemiPersistentState = (key, initialState) => {
  // useState React hook, uses initial state as an argument
  // searchTerm = current state
  // setSearchTerm = function to update state
  // array destructuring used to populate with return values from useState
  const [value, setValue] = React.useState(
    localStorage.getItem(key) || initialState
  );

  // React useEffect hook
  // first argument is function to be called every time searchTerm changes
  // second argument is dependency array of variables
  React.useEffect(() => {
    localStorage.setItem(key, value);
  }, [value, key]);

  return [value, setValue];

}

// track search history
const extractSearchTerm = url => url
                                  .substring(url.lastIndexOf('?') + 1, url.lastIndexOf('&'))
                                  .replace(PARAM_SEARCH, '');

const getLastSearches = urls => 
  urls
    .reduce((result, url, index) => {
      const searchTerm = extractSearchTerm(url);

      if (index === 0) {
        return result.concat(searchTerm);
      }

      const previousSearchTerm = result[result.length - 1];

      if (searchTerm === previousSearchTerm) {
        return result;
      } else {
        return result.concat(searchTerm);
      }
    }, [])
    .slice(-6)
    .slice(0, -1);

const getUrl = (searchTerm, page) => `${API_BASE}${API_SEARCH}?${PARAM_SEARCH}${searchTerm}&${PARAM_PAGE}${page}`;

// Main App Component
const App = () => {

  // manage search term
  const [searchTerm, setSearchTerm] = useSemiPersistentState('search', 'React');

  const [urls, setUrls] = React.useState([
    getUrl(searchTerm, 0)
  ]);

  const handleSearchInput = event => {
    setSearchTerm(event.target.value);
  }

  const handleSearchSubmit = event => {
    handleSearch(searchTerm, 0);

    // prevent browser refresh
    event.preventDefault();
  }

  const handleLastSearch = searchTerm => {
    setSearchTerm(searchTerm);
    handleSearch(searchTerm, 0);
  }

  const handleSearch = (searchTerm, page) => {
    const url = getUrl(searchTerm, page);
    setUrls(urls.concat(url));
  }

  // pagination "More" button pressed
  const handleMore = () => {
    const lastUrl = urls[urls.length - 1];
    const searchTerm = extractSearchTerm(lastUrl);
    handleSearch(searchTerm, stories.page + 1);
  }

  const lastSearches = getLastSearches(urls);

  // state for async data loading
  const [stories, dispatchStories] = React.useReducer(storiesReducer, 
    { data: [], page: 0, isLoading: false, isError: false}
  );

  // re-usable function for fetching data from API
  // this hook creates a memoized function every time its
  // dependency array (searchTerm) changes. As a result, the
  // useEffect hook runs again because it depends on the
  // new function
  const handleFetchStories = React.useCallback(async () => {

    dispatchStories({ type: 'STORIES_FETCH_INIT'});

    try {

      // get data from API
      const lastUrl = urls[urls.length -1];
      const result = await axios.get(lastUrl);

      dispatchStories({
        type: 'STORIES_FETCH_SUCCESS',
        payload: {
          list: result.data.hits,
          page: result.data.page
        }
      });
    } catch {
      dispatchStories({ type: 'STORIES_FETCH_FAILURE'});
    }
  }, [urls]);

  // asyc fetching of stories from API
  React.useEffect(() => {
    handleFetchStories();
  }, [handleFetchStories]);

  const handleRemoveStory = item => {
    dispatchStories({
      type: 'REMOVE_STORY',
      payload: item,
    })
  }

  return (
    <div className="container">
      <h1 className="headline-primary">My Hacker Stories</h1>

      <SearchForm
        searchTerm={searchTerm}
        onSearchInput={handleSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <LastSearches
        lastSearches={lastSearches}
        onLastSearch={handleLastSearch}
      />

      <p>
        Searching for <strong>{searchTerm}</strong>
      </p>

      {/* conditional render if error loading data */}
      {stories.isError && <p>Something went wrong...</p>}

      <List list={stories.data} onRemoveItem={handleRemoveStory} />

      {/* conditional rendering if loading data */}
      {stories.isLoading ? (
        <p>Loading...</p>
      ) : (
        <button type="button" onClick={handleMore}>
          More
        </button>  
      )}
      
    </div>
  );
};

// Last 5 Searches
const LastSearches = ({ lastSearches, onLastSearch }) => (
  <>
    {lastSearches.map((searchTerm, index) => (
        <button
          key={searchTerm + index}
          type="button"
          onClick={() => onLastSearch(searchTerm)}
        >
          {searchTerm}
        </button>
      ))}
  </>
)

// Search Form
const SearchForm = ({
  searchTerm,
  onSearchInput,
  onSearchSubmit
}) => (
  <form onSubmit={onSearchSubmit} className="search-form">
    <InputWithLabel 
      id="search"
      value={searchTerm} 
      isFocused
      onInputChange={onSearchInput}
    >
      <strong>Search:</strong>
    </InputWithLabel>

    <button
      type="submit"
      disabled={!searchTerm}
      className="button button_large"
    >
      Submit
    </button>
  </form>
)

// Generic Input Component
// A - create a "ref" with React's useRef hook. This contains a mutable "current" property.
//     "ref" itself is a persistent value which stays intact over lifetime of React component
// B - ref is passed to input field's JSX reserved "ref" attribute and the element
//     instance is assigned to the changeable "current" property
// C - opt into React's lifecycle with "useEffect" hook, performing the focus on the input
//     field when the component renders
// D - since ref is passed to the input field's "ref" attribute, it's current property
//     gives access to the element. Execute focus programmatically as a side-effect, but only
//     if "isFocused" is set and "current" property is existent
const InputWithLabel = ({ id, value, type='text', onInputChange, isFocused, children}) => {

    // A
    const inputRef = React.useRef();

    // C
    React.useEffect(() => {
      if (isFocused && inputRef.current) {
        // D
        inputRef.current.focus()
      }
    }, [isFocused]);
  
    return (
      <>
      {/* React Fragment */}
      <label htmlFor={id} className="label">{children}</label>
      &nbsp;
      {/* B */}
      <input
        ref={inputRef} 
        id={id} 
        type={type} 
        value={value} 
        autoFocus={isFocused} 
        onChange={onInputChange}
        className="input" 
      />
      </>
    );

};

// Column Sort Handlers
const SORTS = {
  NONE: list => list,
  TITLE: list => sortBy(list, 'title'),
  AUTHOR: list => sortBy(list, 'author'),
  COMMENT: list => sortBy(list, 'num_comments').reverse(),
  POINT: list => sortBy(list, 'points').reverse(),
}

// List Component
const List = ({ list, onRemoveItem }) => {
  
  // sort key for list
  const [sort, setSort] = React.useState({
    sortKey: 'NONE',
    isReverse: false,
  });

  // Column Sorting Support
  const handleSort = sortKey => {
    const isReverse = sort.sortKey === sortKey && !sort.isReverse;
    setSort({ sortKey: sortKey, isReverse: isReverse });
  }

  const sortFunction = SORTS[sort.sortKey];
  const sortedList = sort.isReverse ? sortFunction(list).reverse() : sortFunction(list);

  return (
  <div>
      <div style={{ display: 'flex '}}>
        <span style={{ width: '40%' }}>
          <button type="button" onClick={() => handleSort('TITLE')}>
            Title
          </button>
        </span>
        <span style={{ width: '30%' }}>
          <button type="button" onClick={() => handleSort('AUTHOR')}>
            Author
          </button>
        </span>
        <span style={{ width: '10%' }}>
          <button type="button" onClick={() => handleSort('COMMENT')}>
            Comments
          </button>
        </span>
        <span style={{ width: '10%' }}>
          <button type="button" onClick={() => handleSort('POINT')}>
            Points
          </button>
        </span>
        <span style={{ width: '10%' }}>Actions</span>
      </div>


      {sortedList.map(item => ( <Item key={item.objectID} item={item} onRemoveItem={onRemoveItem} />))}
  </div>
  );
  };
      
// Item component
const Item = ({ item, onRemoveItem }) => {
  
  // remove an item from list
  const handleRemoveItem = () => 
    onRemoveItem(item);

  return (
  <div className="item">
    <span style={{ width: '40%' }}>
      <a href={item.url}>{item.title} </a>
    </span>
    <span style={{ width: '30%' }}>{item.author} </span>
    <span style={{ width: '10%' }}>{item.num_comments} </span>
    <span style={{ width: '10%' }}>{item.points} </span>
    <span style={{ width: '10%' }}>
      <button type="button" onClick={handleRemoveItem} className="button button_small">
        Dismiss
      </button>
    </span>
  </div>
  );
};

export default App;
