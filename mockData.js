const categoriesData = [
    { id: 1, name: 'Main course' }, { id: 2, name: 'Appetizer' }, { id: 3, name: 'Dessert' }, { id: 4, name: 'Beverage' },
];

const menuItemsData = [
    { id: 1, name: 'Crispy Dory Sambal Matah', description: 'Crispy dory fillets...', price: 101.00, image: 'https://images.unsplash.com/photo-1625944230942-905dc6196245?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=60', available: 12, sold: 6, category: 'Main course' },
    { id: 2, name: 'Kopag Benedict', description: 'Legendary poached eggs...', price: 75.00, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=60', available: 5, sold: 32, category: 'Main course' },
    { id: 3, name: 'Holland Bitterballen', description: 'Deep-fried bite sized balls...', price: 50.50, image: 'https://images.unsplash.com/photo-1585109649234-367a17723378?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=60', available: 12, sold: 6, category: 'Appetizer' },
    { id: 4, name: 'Spicy Tuna Nachos', description: 'Spicy tuna on crunchy nacho chips', price: 75.00, image: 'https://images.unsplash.com/photo-1599974579626-1f33a11a1a9e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=60', available: 7, sold: 32, category: 'Appetizer' },
    { id: 5, name: 'Banana Wrap', description: 'Golden brown fried bananas...', price: 75.00, image: 'https://images.unsplash.com/photo-1625242663993-276707f4b3a4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=60', available: 12, sold: 6, category: 'Dessert' },
    { id: 6, name: 'Butterscotch', description: 'A sweet and creamy drink.', price: 35.00, image: 'https://images.unsplash.com/photo-1551024709-8f237c2041f5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=60', available: 20, sold: 15, category: 'Beverage' },
];

module.exports = { categoriesData, menuItemsData };