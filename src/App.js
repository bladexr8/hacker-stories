import React from 'react';
import axios from 'axios';

// API Endpoint
const API_ENDPOINT = 'https://hn.algolia.com/api/v1/search?query='

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
        data: action.payload,
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

// Main App Component
const App = () => {

  // manage search term
  const [searchTerm, setSearchTerm] = useSemiPersistentState('search', 'React');

  const [url, setUrl] = React.useState(
    `${API_ENDPOINT}${searchTerm}`
  );

  const handleSearchInput = event => {
    setSearchTerm(event.target.value);
  }

  const handleSearchSubmit = event => {
    setUrl(`${API_ENDPOINT}${searchTerm}`)

    // prevent browser refresh
    event.preventDefault();
  }

  // state for async data loading
  const [stories, dispatchStories] = React.useReducer(storiesReducer, 
    { data: [], isLoading: false, isError: false}
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
      const result = await axios.get(url);

      dispatchStories({
        type: 'STORIES_FETCH_SUCCESS',
        payload: result.data.hits
      });
    } catch {
      dispatchStories({ type: 'STORIES_FETCH_FAILURE'});
    }
  }, [url]);

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
    <div>
      <h1>My Hacker Stories</h1>

      <SearchForm
        searchTerm={searchTerm}
        onSearchInput={handleSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <p>
        Searching for <strong>{searchTerm}</strong>
      </p>

      <hr />

      {/* conditional render if error loading data */}
      {stories.isError && <p>Something went wrong...</p>}

      {/* conditional rendering if loading data */}
      {stories.isLoading ? (
        <p>Loading...</p>
      ) : (
        <List list={stories.data} onRemoveItem={handleRemoveStory} />
      )}
      
    </div>
  );
};

// Search Form
const SearchForm = ({
  searchTerm,
  onSearchInput,
  onSearchSubmit
}) => (
  <form onSubmit={onSearchSubmit}>
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
      <label htmlFor={id}>{children}</label>
      &nbsp;
      {/* B */}
      <input
        ref={inputRef} 
        id={id} 
        type={type} 
        value={value} 
        autoFocus={isFocused} 
        onChange={onInputChange} 
      />
      </>
    );

};

// List Component
const List = ({ list, onRemoveItem }) => 
  list.map(item => <Item key={item.objectID} item={item} onRemoveItem={onRemoveItem} />);
      
// Item component
const Item = ({ item, onRemoveItem }) => {
  
  // remove an item from list
  const handleRemoveItem = () => 
    onRemoveItem(item);

  return (
  <div>
    <span>
      <a href={item.url}>{item.title} </a>
    </span>
    <span>{item.author} </span>
    <span>{item.num_comments} </span>
    <span>{item.points} </span>
    <span>
      <button type="button" onClick={handleRemoveItem}>
        Dismiss
      </button>
    </span>
  </div>
  );
};

export default App;
